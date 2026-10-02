import { computeExposure } from "@/lib/campaign/exposure";
import { evaluateEligibility } from "@/lib/campaign/eligibility";
import { ORIGINAL_PRICE_CENTS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/ids";
import { refundCapturePartial } from "@/lib/paypal/client";
import { recordPaypalTrace } from "@/lib/paypal/trace";
import {
  getOrdersForSession,
  getSessionById,
} from "@/lib/session/repository";
import type { SessionRow } from "@/lib/types";

export async function launchCampaign(sessionId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const session = getSessionById(sessionId);
  if (!session) return { ok: false, error: "Session not found" };
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "Session expired" };
  }
  if (session.campaign_status !== "accepted") {
    if (
      session.campaign_status === "refunding" ||
      session.campaign_status === "completed" ||
      session.campaign_status === "approved" ||
      session.campaign_status === "partial_failure"
    ) {
      return { ok: false, error: "Campaign already launched" };
    }
    return { ok: false, error: "Accept the recommended price before launching" };
  }
  if (session.recommended_price_cents == null) {
    return { ok: false, error: "Accept a recommended price first" };
  }

  const priceCents = session.recommended_price_cents;
  const db = getDb();
  const ts = nowIso();

  db.prepare(
    `UPDATE demo_sessions SET campaign_status = 'approved', product_price_cents = ?, updated_at = ? WHERE id = ?`,
  ).run(priceCents, ts, sessionId);

  const orders = getOrdersForSession(sessionId);
  for (const order of orders) {
    const eligibility = evaluateEligibility(order, priceCents);
    db.prepare(`UPDATE demo_orders SET eligibility_json = ? WHERE id = ?`).run(
      JSON.stringify(eligibility),
      order.id,
    );
  }

  if (session.batch_id) {
    db.prepare(
      `UPDATE paypal_batches SET status = 'Consumed', updated_at = ? WHERE id = ?`,
    ).run(ts, session.batch_id);
  }

  db.prepare(
    `UPDATE demo_sessions SET campaign_status = 'refunding', updated_at = ? WHERE id = ?`,
  ).run(ts, sessionId);

  void processRefunds(sessionId, priceCents, session.is_preview === 1, session.batch_id);

  return { ok: true };
}

async function processRefunds(
  sessionId: string,
  newPriceCents: number,
  isPreview: boolean,
  batchId: string | null,
) {
  const orders = getOrdersForSession(sessionId);
  const db = getDb();
  let failures = 0;

  for (const order of orders) {
    const eligibility = evaluateEligibility(order, newPriceCents);
    if (!eligibility.eligible) {
      db.prepare(
        `UPDATE demo_orders SET refund_status = 'skipped', eligibility_json = ? WHERE id = ?`,
      ).run(JSON.stringify(eligibility), order.id);
      continue;
    }

    const adjustment = order.purchase_price_cents - newPriceCents;
    if (adjustment <= 0) continue;

    if (order.refund_status === "completed") continue;

    db.prepare(
      `UPDATE demo_orders SET refund_status = 'processing' WHERE id = ?`,
    ).run(order.id);

    const idempotencyKey = `payzap-${sessionId}-${order.id}`;
    let result: Awaited<ReturnType<typeof refundCapturePartial>>;

    if (order.paypal_capture_id) {
      result = await refundCapturePartial({
        captureId: order.paypal_capture_id,
        amountCents: adjustment,
        idempotencyKey,
        allowSimulate: isPreview,
        scope: { sessionId, batchId },
      });
    } else if (isPreview) {
      await new Promise((r) => setTimeout(r, 350));
      const refundId = `PREVIEW-${order.id.slice(-8)}`;
      try {
        recordPaypalTrace({
          scope: { sessionId, batchId },
          kind: "refund",
          path: "/v2/payments/captures/preview/refund",
          statusCode: null,
          ok: true,
          simulated: true,
          amount: (adjustment / 100).toFixed(2),
          captureId: order.paypal_capture_id,
          refundId,
          summary: "Preview only. Not sent to PayPal.",
          durationMs: 350,
        });
      } catch {
        /* The scanner must not stop a preview refund. */
      }
      result = { ok: true, refundId };
    } else {
      result = { ok: false, error: "No PayPal capture linked" };
    }

    const ts = nowIso();
    if (result.ok) {
      db.prepare(
        `UPDATE demo_orders SET
          refund_status = 'completed',
          price_adjustment_cents = ?,
          effective_price_cents = ?,
          paypal_refund_id = ?,
          refund_error = NULL,
          eligibility_json = ?
        WHERE id = ?`,
      ).run(
        adjustment,
        order.purchase_price_cents - adjustment,
        result.refundId ?? null,
        JSON.stringify(eligibility),
        order.id,
      );
    } else {
      failures++;
      db.prepare(
        `UPDATE demo_orders SET refund_status = 'failed', refund_error = ? WHERE id = ?`,
      ).run(result.error ?? "Refund failed", order.id);
    }
  }

  const status = failures > 0 ? "partial_failure" : "completed";
  db.prepare(
    `UPDATE demo_sessions SET campaign_status = ?, buyer_notified = 1, updated_at = ? WHERE id = ?`,
  ).run(status, nowIso(), sessionId);
}

export async function retryOrderRefund(
  sessionId: string,
  orderId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = getSessionById(sessionId);
  if (!session) return { ok: false, error: "Session not found" };
  const order = getOrdersForSession(sessionId).find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.refund_status === "completed") {
    return { ok: false, error: "Already refunded" };
  }

  const price = session.product_price_cents;
  const adjustment = order.purchase_price_cents - price;
  if (adjustment <= 0) return { ok: false, error: "Nothing to refund" };

  const db = getDb();
  db.prepare(
    `UPDATE demo_orders SET refund_status = 'processing' WHERE id = ?`,
  ).run(orderId);

  const result = await refundCapturePartial({
    captureId: order.paypal_capture_id ?? "",
    amountCents: adjustment,
    idempotencyKey: `payzap-retry-${orderId}`,
    allowSimulate: session.is_preview === 1,
    scope: { sessionId, batchId: session.batch_id },
  });

  if (result.ok) {
    db.prepare(
      `UPDATE demo_orders SET refund_status = 'completed', price_adjustment_cents = ?, effective_price_cents = ?, paypal_refund_id = ?, refund_error = NULL WHERE id = ?`,
    ).run(adjustment, order.purchase_price_cents - adjustment, result.refundId ?? null, orderId);
    return { ok: true };
  }

  db.prepare(
    `UPDATE demo_orders SET refund_status = 'failed', refund_error = ? WHERE id = ?`,
  ).run(result.error ?? "Failed", orderId);
  return { ok: false, error: result.error };
}

export function acceptRecommendation(session: SessionRow): {
  ok: boolean;
  error?: string;
} {
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "Session expired" };
  }
  if (session.campaign_status !== "analyzed") {
    return { ok: false, error: "Analyze a campaign before accepting a price" };
  }
  if (!session.proposed_price_cents) {
    return { ok: false, error: "No proposed price to accept" };
  }
  const exposure = computeExposure({
    proposedPriceCents: session.proposed_price_cents,
    refundBudgetCents: session.refund_budget_cents,
    eligibleCount: getOrdersForSession(session.id).length,
  });
  const recommended = exposure.recommendedPriceCents;
  if (recommended == null) {
    return {
      ok: false,
      error: "No budget-safe price to accept. Add a refund budget and analyze again.",
    };
  }

  const db = getDb();
  db.prepare(
    `UPDATE demo_sessions SET campaign_status = 'accepted', recommended_price_cents = ?, updated_at = ? WHERE id = ?`,
  ).run(recommended, nowIso(), session.id);
  return { ok: true };
}

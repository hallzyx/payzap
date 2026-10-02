import {
  BUYER_FIRST_NAMES,
  INITIAL_STOCK,
  ORIGINAL_PRICE_CENTS,
  PRODUCT_NAME,
  PRODUCT_SKU,
  PROTECTED_ORDER_COUNT,
  PROTECTION_WINDOW_DAYS,
  SESSION_DURATION_MS,
  STORE_NAME,
} from "@/lib/constants";
import { getDb, topUpReadyBatches } from "@/lib/db";
import { newId, nowIso, shortId } from "@/lib/ids";
import type {
  BatchRow,
  DemoState,
  OrderRow,
  OrderView,
  SessionRow,
} from "@/lib/types";
import { computeExposure } from "@/lib/campaign/exposure";
import { evaluateEligibility } from "@/lib/campaign/eligibility";

export function isLivePaypalRefund(order: OrderRow): boolean {
  if (order.refund_status !== "completed" || !order.paypal_refund_id) return false;
  if (
    order.paypal_refund_id.startsWith("SIM-") ||
    order.paypal_refund_id.startsWith("PREVIEW-")
  ) {
    return false;
  }
  if (order.paypal_capture_id?.startsWith("SANDBOX-CAP-")) return false;
  return true;
}

function capturesAreSynthetic(captureIds: string[]): boolean {
  return captureIds.length === 0 || captureIds.every((id) => id.startsWith("SANDBOX-CAP-"));
}

function mapOrder(row: OrderRow): OrderView {
  let eligibility = null;
  if (row.eligibility_json) {
    try {
      eligibility = JSON.parse(row.eligibility_json) as OrderView["eligibility"];
    } catch {
      eligibility = null;
    }
  }
  return {
    id: row.id,
    orderNumber: row.order_number,
    buyerName: row.buyer_name,
    isDemoBuyer: row.is_demo_buyer === 1,
    productSku: row.product_sku,
    productName: row.product_name,
    purchasePriceCents: row.purchase_price_cents,
    priceAdjustmentCents: row.price_adjustment_cents,
    effectivePriceCents: row.effective_price_cents,
    paymentProvider: row.payment_provider,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    protectionStatus: row.protection_status,
    purchasedAt: row.purchased_at,
    protectionExpiresAt: row.protection_expires_at,
    paypalCaptureId: row.paypal_capture_id,
    paypalRefundId: row.paypal_refund_id,
    refundStatus: row.refund_status,
    refundError: row.refund_error,
    eligibility,
  };
}

function reserveBatch(sessionId: string): BatchRow | null {
  const db = getDb();
  topUpReadyBatches(db);
  const batch = db
    .prepare(
      `SELECT * FROM paypal_batches
       WHERE status = 'Ready'
       ORDER BY CASE WHEN capture_ids_json LIKE '%SANDBOX-CAP-%' THEN 1 ELSE 0 END,
                created_at ASC
       LIMIT 1`,
    )
    .get() as BatchRow | undefined;

  if (!batch) return null;

  const ts = nowIso();
  db.prepare(
    `UPDATE paypal_batches SET status = 'Reserved', reserved_session_id = ?, updated_at = ? WHERE id = ?`,
  ).run(sessionId, ts, batch.id);

  return { ...batch, status: "Reserved", reserved_session_id: sessionId };
}

export function createDemoSession(): SessionRow {
  const db = getDb();
  const sessionId = newId("sess");
  const buyerId = shortId("buyer");
  const merchantId = shortId("merchant");
  const created = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  const batch = reserveBatch(sessionId);
  let captureIds: string[] = [];
  if (batch) {
    captureIds = JSON.parse(batch.capture_ids_json) as string[];
  }
  const isPreview = !batch || capturesAreSynthetic(captureIds) ? 1 : 0;

  db.prepare(
    `INSERT INTO demo_sessions (
      id, buyer_id, merchant_id, role, product_price_cents, stock,
      campaign_status, batch_id, is_preview, buyer_notified,
      expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, 'buyer', ?, ?, 'idle', ?, ?, 0, ?, ?, ?)`,
  ).run(
    sessionId,
    buyerId,
    merchantId,
    ORIGINAL_PRICE_CENTS,
    INITIAL_STOCK,
    batch?.id ?? null,
    isPreview,
    expiresAt,
    created,
    created,
  );

  const insertOrder = db.prepare(
    `INSERT INTO demo_orders (
      id, session_id, order_number, buyer_name, is_demo_buyer,
      product_sku, product_name, purchase_price_cents, price_adjustment_cents,
      effective_price_cents, payment_provider, payment_status, order_status,
      protection_status, purchased_at, protection_expires_at,
      paypal_capture_id, refund_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'PayPal', 'Completed', 'Delivered',
      'Active', ?, ?, ?, 'queued', ?)`,
  );

  for (let i = 0; i < PROTECTED_ORDER_COUNT; i++) {
    const orderId = newId("ord");
    const daysAgo = (i % 5) + 1;
    const purchasedAt = new Date(
      Date.now() - daysAgo * 24 * 60 * 60 * 1000,
    ).toISOString();
    const protectionExpires = new Date(
      Date.now() + (PROTECTION_WINDOW_DAYS - daysAgo) * 24 * 60 * 60 * 1000,
    ).toISOString();
    const isDemoBuyer = i === 0 ? 1 : 0;
    const buyerName = isDemoBuyer
      ? `${BUYER_FIRST_NAMES[0]} (${buyerId})`
      : BUYER_FIRST_NAMES[i];
    const captureId = captureIds[i] ?? null;

    insertOrder.run(
      orderId,
      sessionId,
      `AST-${1000 + i}`,
      buyerName,
      isDemoBuyer,
      PRODUCT_SKU,
      PRODUCT_NAME,
      ORIGINAL_PRICE_CENTS,
      ORIGINAL_PRICE_CENTS,
      purchasedAt,
      protectionExpires,
      captureId,
      created,
    );
  }

  return getSessionById(sessionId)!;
}

export function getSessionById(id: string): SessionRow | null {
  const db = getDb();
  return (
    (db.prepare(`SELECT * FROM demo_sessions WHERE id = ?`).get(id) as
      | SessionRow
      | undefined) ?? null
  );
}

export function getOrdersForSession(sessionId: string): OrderRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM demo_orders WHERE session_id = ? ORDER BY is_demo_buyer DESC, order_number ASC`,
    )
    .all(sessionId) as OrderRow[];
}

export function setSessionRole(sessionId: string, role: "buyer" | "merchant") {
  const db = getDb();
  db.prepare(
    `UPDATE demo_sessions SET role = ?, updated_at = ? WHERE id = ?`,
  ).run(role, nowIso(), sessionId);
}

export function buildDemoState(session: SessionRow): DemoState {
  const orders = getOrdersForSession(session.id).map(mapOrder);
  const remainingMs = new Date(session.expires_at).getTime() - Date.now();
  const expired = remainingMs <= 0;

  const protectedRevenueCents = orders.reduce(
    (sum, o) => sum + o.purchasePriceCents,
    0,
  );
  const totalRefundedCents = orders.reduce(
    (sum, o) => sum + o.priceAdjustmentCents,
    0,
  );
  const completedRefunds = orders.filter(
    (o) => o.refundStatus === "completed",
  ).length;
  const failedRefunds = orders.filter((o) => o.refundStatus === "failed").length;

  let analysis = null;
  if (session.proposed_price_cents != null) {
    analysis = computeExposure({
      proposedPriceCents: session.proposed_price_cents,
      refundBudgetCents: session.refund_budget_cents,
      eligibleCount: orders.filter((o) => o.protectionStatus === "Active").length,
    });
    if (session.recommended_price_cents != null) {
      analysis = {
        ...analysis,
        recommendedPriceCents: session.recommended_price_cents,
        recommendedExposureCents: computeExposure({
          proposedPriceCents: session.recommended_price_cents,
          refundBudgetCents: session.refund_budget_cents,
          eligibleCount: orders.length,
        }).totalExposureCents,
      };
    }
  }

  let currentExposure = 0;
  if (
    session.campaign_status === "idle" ||
    session.campaign_status === "analyzed" ||
    session.campaign_status === "accepted"
  ) {
    currentExposure = 0;
  } else {
    currentExposure = totalRefundedCents || 0;
  }

  const db = getDb();
  const readyRow = db
    .prepare(`SELECT COUNT(*) as c FROM paypal_batches WHERE status = 'Ready'`)
    .get() as { c: number };
  let batchConsumed = false;
  if (session.batch_id) {
    const batch = db
      .prepare(`SELECT status FROM paypal_batches WHERE id = ?`)
      .get(session.batch_id) as { status: string } | undefined;
    batchConsumed = batch?.status === "Consumed";
  }
  const orderRows = getOrdersForSession(session.id);

  return {
    session: {
      id: session.id,
      buyerId: session.buyer_id,
      merchantId: session.merchant_id,
      role: session.role,
      productPriceCents: session.product_price_cents,
      stock: session.stock,
      campaignStatus: session.campaign_status,
      proposedPriceCents: session.proposed_price_cents,
      refundBudgetCents: session.refund_budget_cents,
      recommendedPriceCents: session.recommended_price_cents,
      analyzedPrompt: session.analyzed_prompt,
      batchId: session.batch_id,
      isPreview: session.is_preview === 1,
      buyerNotified: session.buyer_notified === 1,
      expiresAt: session.expires_at,
      remainingMs: Math.max(0, remainingMs),
      expired,
      hasLivePaypalRefunds: orderRows.some(isLivePaypalRefund),
      readyBatchCount: readyRow.c,
      batchConsumed,
    },
    product: {
      name: PRODUCT_NAME,
      sku: PRODUCT_SKU,
      priceCents: session.product_price_cents,
      stock: session.stock,
      protectedPurchaseCount: orders.length,
      salesCount: orders.length,
    },
    orders,
    metrics: {
      protectedRevenueCents,
      protectedPurchases: orders.length,
      currentRefundExposureCents: currentExposure,
      totalRefundedCents,
      completedRefunds,
      failedRefunds,
    },
    analysis,
  };
}

export function saveAnalysis(
  sessionId: string,
  data: {
    proposedPriceCents: number;
    refundBudgetCents: number | null;
    recommendedPriceCents: number | null;
    analyzedPrompt: string;
  },
) {
  const db = getDb();
  db.prepare(
    `UPDATE demo_sessions SET
      campaign_status = 'analyzed',
      proposed_price_cents = ?,
      refund_budget_cents = ?,
      recommended_price_cents = ?,
      analyzed_prompt = ?,
      updated_at = ?
    WHERE id = ?`,
  ).run(
    data.proposedPriceCents,
    data.refundBudgetCents,
    data.recommendedPriceCents,
    data.analyzedPrompt,
    nowIso(),
    sessionId,
  );
}

export function resetScenario(sessionId: string): {
  ok: boolean;
  error?: string;
  paypalHistoryPreserved: boolean;
} {
  const db = getDb();
  const session = getSessionById(sessionId);
  if (!session) {
    return { ok: false, error: "Session not found", paypalHistoryPreserved: false };
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "Session expired", paypalHistoryPreserved: false };
  }

  const live = getOrdersForSession(sessionId).some(isLivePaypalRefund);
  if (live) {
    return { ok: true, paypalHistoryPreserved: true };
  }

  const ts = nowIso();
  db.prepare(
    `UPDATE demo_sessions SET
      product_price_cents = ?,
      stock = ?,
      campaign_status = 'idle',
      proposed_price_cents = NULL,
      refund_budget_cents = NULL,
      recommended_price_cents = NULL,
      analyzed_prompt = NULL,
      buyer_notified = 0,
      updated_at = ?
    WHERE id = ?`,
  ).run(ORIGINAL_PRICE_CENTS, INITIAL_STOCK, ts, sessionId);

  db.prepare(
    `UPDATE demo_orders SET
      price_adjustment_cents = 0,
      effective_price_cents = purchase_price_cents,
      paypal_refund_id = NULL,
      refund_status = 'queued',
      refund_error = NULL,
      eligibility_json = NULL
    WHERE session_id = ?`,
  ).run(sessionId);

  return { ok: true, paypalHistoryPreserved: false };
}

export function startFreshLiveRun(sessionId: string): {
  ok: boolean;
  error?: string;
  preview: boolean;
} {
  const db = getDb();
  const session = getSessionById(sessionId);
  if (!session) return { ok: false, error: "Session not found", preview: true };
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "Session expired", preview: session.is_preview === 1 };
  }

  const ts = nowIso();
  if (session.batch_id) {
    db.prepare(
      `UPDATE paypal_batches SET status = 'Consumed', updated_at = ? WHERE id = ?`,
    ).run(ts, session.batch_id);
  }

  const batch = reserveBatch(sessionId);
  const captureIds: string[] = batch
    ? (JSON.parse(batch.capture_ids_json) as string[])
    : [];
  const preview = !batch || capturesAreSynthetic(captureIds);

  db.prepare(
    `UPDATE demo_sessions SET
      product_price_cents = ?,
      stock = ?,
      campaign_status = 'idle',
      proposed_price_cents = NULL,
      refund_budget_cents = NULL,
      recommended_price_cents = NULL,
      analyzed_prompt = NULL,
      batch_id = ?,
      is_preview = ?,
      buyer_notified = 0,
      updated_at = ?
    WHERE id = ?`,
  ).run(
    ORIGINAL_PRICE_CENTS,
    INITIAL_STOCK,
    batch?.id ?? null,
    preview ? 1 : 0,
    ts,
    sessionId,
  );

  const orders = getOrdersForSession(sessionId);
  const updateOrder = db.prepare(
    `UPDATE demo_orders SET
      price_adjustment_cents = 0,
      effective_price_cents = purchase_price_cents,
      paypal_capture_id = ?,
      paypal_refund_id = NULL,
      refund_status = 'queued',
      refund_error = NULL,
      eligibility_json = NULL
    WHERE id = ?`,
  );
  orders.forEach((order, index) => {
    updateOrder.run(captureIds[index] ?? null, order.id);
  });

  return { ok: true, preview };
}

export { evaluateEligibility, STORE_NAME };

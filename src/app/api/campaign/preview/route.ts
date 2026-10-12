import { NextResponse } from "next/server";
import { exposureAt } from "@/lib/campaign/exposure";
import { evaluatePolicyEligibility } from "@/lib/campaign/eligibility";
import { ORIGINAL_PRICE_CENTS } from "@/lib/constants";
import {
  getOrdersForSession,
  getPolicyForSession,
  getSessionById,
} from "@/lib/session/repository";
import { getSessionIdFromCookies } from "@/lib/session/cookies";

/**
 * Read-only planning view for the PayZap console.
 * Computes the refund-exposure curve and per-order policy coverage with the
 * same deterministic code the analysis uses. It never writes to the session.
 */
export async function GET() {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  const session = getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const orders = getOrdersForSession(sessionId);
  const policy = getPolicyForSession(session);
  const now = new Date();

  const proposed = session.proposed_price_cents;
  const floorCents = Math.max(
    0,
    Math.min(
      50_000,
      proposed != null ? Math.floor(proposed / 10_000) * 10_000 - 10_000 : 50_000,
    ),
  );
  const stepCents = 1_000;
  const prices = new Set<number>();
  for (let p = floorCents; p <= ORIGINAL_PRICE_CENTS; p += stepCents) prices.add(p);
  if (proposed != null) prices.add(proposed);
  if (session.recommended_price_cents != null) prices.add(session.recommended_price_cents);

  const curve = [...prices]
    .sort((a, b) => a - b)
    .map((priceCents) => ({
      priceCents,
      exposureCents: exposureAt(orders, policy, priceCents, now),
    }));

  // Probe just below the purchase price (or at the analyzed price) to show who
  // the policy covers before any money moves.
  const probe = proposed != null && proposed < ORIGINAL_PRICE_CENTS
    ? proposed
    : ORIGINAL_PRICE_CENTS - 100;
  const coverage = orders.map((order) => {
    const result = evaluatePolicyEligibility(order, probe, now, policy);
    return {
      orderId: order.id,
      orderNumber: order.order_number,
      buyerName: order.buyer_name,
      isDemoBuyer: order.is_demo_buyer === 1,
      covered: result.eligible,
      reasons: result.checks
        .filter((c) => !c.passed)
        .map((c) => ({ label: c.label, cite: c.cite ?? null })),
      ruleChecks: result.checks
        .filter((c) => c.ruleId)
        .map((c) => ({
          ruleId: c.ruleId as string,
          label: c.label,
          passed: c.passed,
          cite: c.cite ?? null,
        })),
    };
  });

  return NextResponse.json(
    {
      originalPriceCents: ORIGINAL_PRICE_CENTS,
      budgetCents: session.refund_budget_cents,
      proposedPriceCents: proposed,
      recommendedPriceCents: session.recommended_price_cents,
      curve,
      coverage,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

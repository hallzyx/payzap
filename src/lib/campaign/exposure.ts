import { ORIGINAL_PRICE_CENTS } from "@/lib/constants";
import { evaluatePolicyEligibility } from "@/lib/campaign/eligibility";
import { DEFAULT_POLICY, type Policy } from "@/lib/policy/schema";
import type { ExcludedOrder, ExposureAnalysis, OrderRow } from "@/lib/types";

const WHOLE_DOLLAR_CENTS = 100;

/** Total refunds if the price drops to priceCents, under the given policy. */
export function exposureAt(
  orders: OrderRow[],
  policy: Policy,
  priceCents: number,
  now = new Date(),
): number {
  let total = 0;
  for (const order of orders) {
    if (evaluatePolicyEligibility(order, priceCents, now, policy).eligible) {
      total += order.purchase_price_cents - priceCents;
    }
  }
  return total;
}

/**
 * Lowest price (in cents) whose total refunds stay within the budget.
 * Exposure never rises as the price rises, so a binary search is exact.
 */
function lowestSafePrice(
  orders: OrderRow[],
  policy: Policy,
  budgetCents: number,
  ceilingCents: number,
  now: Date,
): number {
  let lo = 0;
  let hi = ceilingCents;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (exposureAt(orders, policy, mid, now) <= budgetCents) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function computeExposure(params: {
  proposedPriceCents: number;
  refundBudgetCents: number | null;
  orders: OrderRow[];
  policy?: Policy;
  originalPriceCents?: number;
  now?: Date;
}): ExposureAnalysis {
  const policy = params.policy ?? DEFAULT_POLICY;
  const now = params.now ?? new Date();
  const original = params.originalPriceCents ?? ORIGINAL_PRICE_CENTS;
  const proposed = params.proposedPriceCents;
  const perOrder = Math.max(0, original - proposed);
  const budget = params.refundBudgetCents;

  const eligible: OrderRow[] = [];
  const excludedOrders: ExcludedOrder[] = [];
  for (const order of params.orders) {
    const result = evaluatePolicyEligibility(order, proposed, now, policy);
    if (result.eligible) {
      eligible.push(order);
    } else if (perOrder > 0) {
      excludedOrders.push({
        orderNumber: order.order_number,
        reasons: result.checks.filter((c) => !c.passed).map((c) => c.label),
      });
    }
  }

  const totalExposure = exposureAt(params.orders, policy, proposed, now);
  const exceedsBudget = budget !== null && totalExposure > budget;
  const overByCents = exceedsBudget && budget !== null ? totalExposure - budget : 0;

  let recommendedPriceCents: number | null = null;
  let recommendedExposureCents: number | null = null;
  let reason = "No refund budget constraint was provided.";

  if (perOrder <= 0) {
    reason =
      "The proposed price is not below the current price, so no price-protection liability is created.";
  } else if (budget !== null) {
    if (exceedsBudget) {
      const lowest = lowestSafePrice(params.orders, policy, budget, original, now);
      // Round up to a whole dollar: a higher price only lowers the exposure.
      recommendedPriceCents = Math.min(
        original,
        Math.ceil(lowest / WHOLE_DOLLAR_CENTS) * WHOLE_DOLLAR_CENTS,
      );
      recommendedExposureCents = exposureAt(
        params.orders,
        policy,
        recommendedPriceCents,
        now,
      );
      reason = `Your policy covers ${eligible.length} of ${params.orders.length} orders. Keeping refunds within $${(budget / 100).toLocaleString()} allows a promotional price of $${(recommendedPriceCents / 100).toLocaleString()}.`;
    } else {
      recommendedPriceCents = proposed;
      recommendedExposureCents = totalExposure;
      reason = `Your policy covers ${eligible.length} of ${params.orders.length} orders. The proposed price already keeps refunds within $${(budget / 100).toLocaleString()}.`;
    }
  }

  return {
    proposedPriceCents: proposed,
    refundBudgetCents: budget,
    eligibleCount: eligible.length,
    excludedOrders,
    refundPerOrderCents: perOrder,
    totalExposureCents: totalExposure,
    exceedsBudget,
    overByCents,
    recommendedPriceCents,
    recommendedExposureCents,
    reason,
  };
}

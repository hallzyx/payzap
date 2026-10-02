import {
  ORIGINAL_PRICE_CENTS,
  PROTECTED_ORDER_COUNT,
} from "@/lib/constants";
import type { ExposureAnalysis } from "@/lib/types";

export function computeExposure(params: {
  proposedPriceCents: number;
  refundBudgetCents: number | null;
  eligibleCount: number;
  originalPriceCents?: number;
}): ExposureAnalysis {
  const original = params.originalPriceCents ?? ORIGINAL_PRICE_CENTS;
  const perOrder = Math.max(0, original - params.proposedPriceCents);
  const totalExposure = perOrder * params.eligibleCount;
  const budget = params.refundBudgetCents;
  const exceedsBudget =
    budget !== null && budget !== undefined && totalExposure > budget;
  const overByCents = exceedsBudget && budget !== null ? totalExposure - budget : 0;

  let recommendedPriceCents: number | null = null;
  let recommendedExposureCents: number | null = null;
  let reason = "No refund budget constraint was provided.";

  if (budget !== null && params.eligibleCount > 0 && perOrder > 0) {
    const maxPerCustomer = Math.floor(budget / params.eligibleCount);
    recommendedPriceCents = original - maxPerCustomer;
    recommendedExposureCents = maxPerCustomer * params.eligibleCount;
    reason = `Spreading your $${(budget / 100).toLocaleString()} refund budget across ${params.eligibleCount} protected customers allows up to $${(maxPerCustomer / 100).toLocaleString()} per order — a promotional price of $${(recommendedPriceCents / 100).toLocaleString()}.`;
  } else if (perOrder <= 0) {
    reason = "The proposed price is not below the current price, so no price-protection liability is created.";
  }

  return {
    proposedPriceCents: params.proposedPriceCents,
    refundBudgetCents: budget,
    eligibleCount: params.eligibleCount,
    refundPerOrderCents: perOrder,
    totalExposureCents: totalExposure,
    exceedsBudget,
    overByCents,
    recommendedPriceCents,
    recommendedExposureCents,
    reason,
  };
}

export function countEligibleForExposure(
  orderCount: number = PROTECTED_ORDER_COUNT,
): number {
  return orderCount;
}

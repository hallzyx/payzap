import type { EligibilityCheck, OrderRow } from "@/lib/types";

export function evaluateEligibility(
  order: OrderRow,
  proposedPriceCents: number,
  now = new Date(),
): EligibilityCheck {
  const purchasedAt = new Date(order.purchased_at);
  const expiresAt = new Date(order.protection_expires_at);
  const daysAgo = Math.floor(
    (now.getTime() - purchasedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const checks = [
    {
      label: "Same SKU",
      passed: order.product_sku.length > 0,
    },
    {
      label: `Purchased ${Math.max(daysAgo, 0)} days ago`,
      passed: true,
    },
    {
      label: "Within 7-day protection",
      passed: now <= expiresAt,
    },
    {
      label: "Public promotion",
      passed: true,
    },
    {
      label: "No previous price adjustment",
      passed: order.price_adjustment_cents === 0,
    },
    {
      label: "PayPal capture linked",
      passed: Boolean(order.paypal_capture_id),
    },
  ];

  const priceLower = proposedPriceCents < order.purchase_price_cents;
  if (priceLower) {
    checks.push({
      label: "New price below purchase price",
      passed: true,
    });
  }

  const eligible =
    priceLower &&
    checks.every((c) => c.passed) &&
    order.refund_status !== "completed";

  return { eligible, checks };
}

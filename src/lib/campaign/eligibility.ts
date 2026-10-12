import {
  DEFAULT_POLICY,
  windowDaysFor,
  type Policy,
  type PolicyRule,
} from "@/lib/policy/schema";
import type { EligibilityCheck, OrderRow } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

type Check = EligibilityCheck["checks"][number];

function windowRuleFor(
  policy: Policy,
  condition: "new" | "open_box",
): Extract<PolicyRule, { type: "window" }> | undefined {
  const windows = policy.rules.filter(
    (r): r is Extract<PolicyRule, { type: "window" }> => r.type === "window",
  );
  return (
    windows.find((w) => w.condition === condition) ??
    windows.find((w) => w.condition === "any")
  );
}

function buildChecks(
  order: OrderRow,
  proposedPriceCents: number,
  now: Date,
  policy: Policy,
  includeCapture: boolean,
): EligibilityCheck {
  const purchasedAt = new Date(order.purchased_at);
  const daysAgo = Math.floor((now.getTime() - purchasedAt.getTime()) / DAY_MS);
  const windowDays = windowDaysFor(policy, order.item_condition);
  const windowRule = windowRuleFor(policy, order.item_condition);
  // Whole days, matching the "Purchased N days ago" label shown next to it.
  const withinWindow = daysAgo <= windowDays;

  const checks: Check[] = [
    { label: "Same SKU", passed: order.product_sku.length > 0 },
    { label: `Purchased ${Math.max(daysAgo, 0)} days ago`, passed: true },
    {
      label: `Within ${windowDays}-day protection${
        order.item_condition === "open_box" ? " (open-box)" : ""
      }`,
      passed: withinWindow,
      ruleId: windowRule?.id,
      cite: windowRule?.sourceSpan,
    },
  ];

  for (const rule of policy.rules) {
    if (rule.type === "exclude_coupon") {
      const code = order.coupon_code?.toUpperCase() ?? null;
      const excluded =
        code !== null &&
        (rule.codes.length === 0 ||
          rule.codes.some((c) => c.toUpperCase() === code));
      checks.push({
        label: excluded
          ? `Paid with coupon ${order.coupon_code}`
          : "No excluded coupon used",
        passed: !excluded,
        ruleId: rule.id,
        cite: rule.sourceSpan,
      });
    } else if (rule.type === "exclude_condition") {
      const excluded = order.item_condition === rule.condition;
      checks.push({
        label: excluded
          ? `Item condition: ${rule.condition === "open_box" ? "open-box" : "new"} is not covered`
          : "Item condition covered",
        passed: !excluded,
        ruleId: rule.id,
        cite: rule.sourceSpan,
      });
    }
  }

  checks.push(
    { label: "Public promotion", passed: true },
    {
      label: "No previous price adjustment",
      passed: order.price_adjustment_cents === 0,
    },
  );
  if (includeCapture) {
    checks.push({
      label: "PayPal capture linked",
      passed: Boolean(order.paypal_capture_id),
    });
  }

  const priceLower = proposedPriceCents < order.purchase_price_cents;
  if (priceLower) {
    checks.push({ label: "New price below purchase price", passed: true });
  }

  const eligible =
    priceLower &&
    checks.every((c) => c.passed) &&
    order.refund_status !== "completed";

  return { eligible, checks };
}

/** Full check used when money moves: includes the linked PayPal capture. */
export function evaluateEligibility(
  order: OrderRow,
  proposedPriceCents: number,
  now = new Date(),
  policy: Policy = DEFAULT_POLICY,
): EligibilityCheck {
  return buildChecks(order, proposedPriceCents, now, policy, true);
}

/** Planning check: who the merchant's policy covers, before captures matter. */
export function evaluatePolicyEligibility(
  order: OrderRow,
  proposedPriceCents: number,
  now = new Date(),
  policy: Policy = DEFAULT_POLICY,
): EligibilityCheck {
  return buildChecks(order, proposedPriceCents, now, policy, false);
}

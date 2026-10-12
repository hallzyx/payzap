import { createHash } from "crypto";
import { z } from "zod";
import { PROTECTION_WINDOW_DAYS } from "@/lib/constants";

/**
 * A price-protection policy compiled from the merchant's own prose.
 * The model may only produce these closed rule types. Dollar amounts are never
 * part of a rule: refunds always come from the order price minus the new price.
 */

const base = {
  id: z.string().min(1).max(40),
  /** Verbatim quote from the merchant's text that justifies the rule. */
  sourceSpan: z.string().min(1).max(400),
  summary: z.string().min(1).max(160),
};

export const itemConditionSchema = z.enum(["new", "open_box"]);

export const ruleSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("window"),
    days: z.number().int().min(1).max(90),
    condition: z.enum(["any", "new", "open_box"]),
  }),
  z.object({
    ...base,
    type: z.literal("exclude_coupon"),
    /** Empty list means any coupon code disqualifies the order. */
    codes: z.array(z.string().min(1).max(40)).max(10),
  }),
  z.object({
    ...base,
    type: z.literal("exclude_condition"),
    condition: itemConditionSchema,
  }),
]);

export const ambiguityOptionSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  rules: z.array(ruleSchema).max(3),
});

export const ambiguitySchema = z.object({
  id: z.string().min(1).max(40),
  question: z.string().min(1).max(200),
  sourceSpan: z.string().min(1).max(400),
  options: z.array(ambiguityOptionSchema).min(2).max(4),
});

export type PolicyRule = z.infer<typeof ruleSchema>;
export type PolicyAmbiguity = z.infer<typeof ambiguitySchema>;

export type PolicySource = "default" | "deterministic" | "openai" | "deepseek";

export interface Policy {
  version: 1;
  source: PolicySource;
  rules: PolicyRule[];
  /** Questions the merchant still has to answer. */
  ambiguities: PolicyAmbiguity[];
  /** ambiguityId -> chosen optionId. */
  resolved: Record<string, string>;
  /** Rules or ambiguities dropped because they quoted text that is not there. */
  discarded: number;
}

export const DEFAULT_POLICY: Policy = {
  version: 1,
  source: "default",
  rules: [
    {
      id: "default-window",
      type: "window",
      days: PROTECTION_WINDOW_DAYS,
      condition: "any",
      sourceSpan: "Default demo policy",
      summary: `Protected for ${PROTECTION_WINDOW_DAYS} days after purchase`,
    },
  ],
  ambiguities: [],
  resolved: {},
  discarded: 0,
};

export function parsePolicyJson(raw: string | null | undefined): Policy {
  if (!raw) return DEFAULT_POLICY;
  try {
    const data = JSON.parse(raw) as Policy;
    if (data?.version === 1 && Array.isArray(data.rules)) return data;
  } catch {
    /* fall through */
  }
  return DEFAULT_POLICY;
}

/** Short stable fingerprint of the rules, sent to PayPal as the refund's custom_id. */
export function policyHash(policy: Policy): string {
  // JSON.stringify skips undefined, so only the rule's behavior is hashed.
  const stable = JSON.stringify(
    policy.rules.map((rule) => ({
      ...rule,
      id: undefined,
      sourceSpan: undefined,
      summary: undefined,
    })),
  );
  return createHash("sha256").update(stable).digest("hex").slice(0, 8);
}

export function normalizeForQuote(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/** True when the quote really appears in the merchant's text. */
export function quoteIsPresent(quote: string, text: string): boolean {
  const q = normalizeForQuote(quote);
  return q.length > 0 && normalizeForQuote(text).includes(q);
}

export function windowDaysFor(
  policy: Policy,
  condition: "new" | "open_box",
): number {
  const windows = policy.rules.filter(
    (rule): rule is Extract<PolicyRule, { type: "window" }> =>
      rule.type === "window",
  );
  const specific = windows.find((w) => w.condition === condition);
  if (specific) return specific.days;
  const any = windows.find((w) => w.condition === "any");
  if (any) return any.days;
  return PROTECTION_WINDOW_DAYS;
}

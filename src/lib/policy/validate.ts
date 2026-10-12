import { z } from "zod";
import {
  ambiguitySchema,
  DEFAULT_POLICY,
  quoteIsPresent,
  ruleSchema,
  type Policy,
  type PolicyAmbiguity,
  type PolicyRule,
  type PolicySource,
} from "@/lib/policy/schema";

const draftSchema = z.object({
  rules: z.array(z.unknown()).max(12).default([]),
  ambiguities: z.array(z.unknown()).max(4).default([]),
});

/**
 * Turns an untrusted draft (from a model or the keyword compiler) into a policy.
 * Anything outside the closed schema, or quoting text the merchant never wrote,
 * is dropped and counted. A prompt injected into the policy text cannot create
 * a rule type that does not exist here.
 */
export function validatePolicyDraft(
  raw: unknown,
  text: string,
  source: PolicySource,
): Policy | null {
  const draft = draftSchema.safeParse(raw);
  if (!draft.success) return null;

  let discarded = 0;
  const rules: PolicyRule[] = [];
  const usedIds = new Set<string>();

  const acceptRule = (candidate: unknown, quoteSource: string): PolicyRule | null => {
    const parsed = ruleSchema.safeParse(candidate);
    if (!parsed.success) return null;
    if (!quoteIsPresent(parsed.data.sourceSpan, quoteSource)) return null;
    return parsed.data;
  };

  for (const candidate of draft.data.rules) {
    const rule = acceptRule(candidate, text);
    if (!rule) {
      discarded++;
      continue;
    }
    let id = rule.id;
    for (let n = 2; usedIds.has(id); n++) id = `${rule.id}-${n}`;
    usedIds.add(id);
    rules.push({ ...rule, id });
  }

  const ambiguities: PolicyAmbiguity[] = [];
  for (const candidate of draft.data.ambiguities) {
    const parsed = ambiguitySchema.safeParse(candidate);
    if (!parsed.success || !quoteIsPresent(parsed.data.sourceSpan, text)) {
      discarded++;
      continue;
    }
    // Option rules cite the sentence that raised the question, not new text.
    const options = parsed.data.options.map((option) => ({
      ...option,
      rules: option.rules.map((rule) => ({
        ...rule,
        sourceSpan: parsed.data.sourceSpan,
      })),
    }));
    ambiguities.push({ ...parsed.data, options });
  }

  if (rules.length === 0 && ambiguities.length === 0) return null;

  return {
    version: 1,
    source,
    rules,
    ambiguities,
    resolved: {},
    discarded,
  };
}

/** A policy always needs a protection window. Fall back to the demo default. */
export function withWindowFallback(policy: Policy): Policy {
  const hasWindow = policy.rules.some((r) => r.type === "window");
  const pendingWindow = policy.ambiguities.some((a) =>
    a.options.some((o) => o.rules.some((r) => r.type === "window")),
  );
  if (hasWindow || pendingWindow) return policy;
  return { ...policy, rules: [...DEFAULT_POLICY.rules, ...policy.rules] };
}

/** Applies the merchant's answer to one question and removes it from the queue. */
export function resolveAmbiguity(
  policy: Policy,
  ambiguityId: string,
  optionId: string,
): Policy | null {
  const ambiguity = policy.ambiguities.find((a) => a.id === ambiguityId);
  const option = ambiguity?.options.find((o) => o.id === optionId);
  if (!ambiguity || !option) return null;

  const usedIds = new Set(policy.rules.map((r) => r.id));
  const added = option.rules.map((rule) => {
    let id = rule.id;
    for (let n = 2; usedIds.has(id); n++) id = `${rule.id}-${n}`;
    usedIds.add(id);
    return { ...rule, id };
  });

  return withWindowFallback({
    ...policy,
    rules: [...policy.rules, ...added],
    ambiguities: policy.ambiguities.filter((a) => a.id !== ambiguityId),
    resolved: { ...policy.resolved, [ambiguityId]: optionId },
  });
}

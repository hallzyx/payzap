import {
  CAMPAIGN_PROMPT_MAX_CHARS,
  DEFAULT_PROMO_PROMPT,
  POLICY_TEXT_MAX_CHARS,
  POLICY_TEXT_MIN_CHARS,
} from "@/lib/constants";

const MAX_WORDS = 45;
const MAX_ANALYSES_PER_SESSION = 6;
const MIN_GAP_MS = 3_000;

const MAX_POLICY_COMPILES_PER_SESSION = 4;

const turns = new Map<string, { count: number; lastAt: number }>();
const policyTurns = new Map<string, { count: number; lastAt: number }>();

const POLICY_WORD =
  /\b(protect\w*|guarantee\w*|price|prices|coupon|refund\w*|adjust\w*|days?|open[- ]?box|window|purchase\w*|orders?)\b/i;

const CAMPAIGN_WORD =
  /\b(price|priced|campaign|promotion|promo|refund|refunds|budget|under|drop|sale|discount)\b/i;
const DOLLAR_AMOUNT = /\$\s*\d/;
const PLAIN_AMOUNT = /\b\d{2,5}\b/;
const JAILBREAK =
  /ignore (all |any )?(previous|above|prior)|disregard (the |all )?(instructions|rules)|you are now|system prompt|jailbreak|developer message/i;

export type PromptReview =
  | { ok: true; prompt: string }
  | { ok: false; error: string };

function normalize(raw: string): string {
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/\s+/g, " ").trim();
}

/** Accepts only a short merchant sentence about a price and a refund budget. */
export function reviewCampaignPrompt(raw: string | undefined): PromptReview {
  if ((raw ?? "").length > CAMPAIGN_PROMPT_MAX_CHARS) {
    return {
      ok: false,
      error: "Keep the campaign to one short sentence with a price and a refund budget.",
    };
  }

  const text = normalize(raw ?? "") || DEFAULT_PROMO_PROMPT;

  if (text.length > CAMPAIGN_PROMPT_MAX_CHARS) {
    return {
      ok: false,
      error: "Keep the campaign to one short sentence with a price and a refund budget.",
    };
  }

  const words = text.split(" ").filter(Boolean);
  if (words.length > MAX_WORDS) {
    return {
      ok: false,
      error: "Keep the campaign to one short sentence with a price and a refund budget.",
    };
  }

  if (JAILBREAK.test(text)) {
    return {
      ok: false,
      error: "PayZap only reads a sale price and a refund budget.",
    };
  }

  const hasAmount = DOLLAR_AMOUNT.test(text) || PLAIN_AMOUNT.test(text);
  if (!hasAmount || !CAMPAIGN_WORD.test(text)) {
    return {
      ok: false,
      error: "Include a promotional price and, if you want, a refund budget. PayZap does not answer other requests.",
    };
  }

  return { ok: true, prompt: text };
}

/** Limits how often one demo session can spend a model call. */
export function takeAnalysisTurn(sessionId: string): PromptReview {
  const now = Date.now();
  const current = turns.get(sessionId) ?? { count: 0, lastAt: 0 };

  if (now - current.lastAt < MIN_GAP_MS) {
    return {
      ok: false,
      error: "PayZap is still reading the last sentence. Wait a moment, then analyze again.",
    };
  }

  if (current.count >= MAX_ANALYSES_PER_SESSION) {
    return {
      ok: false,
      error: "This demo can analyze a few campaign sentences. Reset the scenario to plan again.",
    };
  }

  turns.set(sessionId, { count: current.count + 1, lastAt: now });
  return { ok: true, prompt: "" };
}

/** Accepts only a short paragraph that reads like a price-protection policy. */
export function reviewPolicyText(raw: unknown): PromptReview {
  if (typeof raw !== "string") {
    return { ok: false, error: "Paste your price-protection policy as text." };
  }
  if (raw.length > POLICY_TEXT_MAX_CHARS * 2) {
    return {
      ok: false,
      error: `Keep the policy under ${POLICY_TEXT_MAX_CHARS} characters.`,
    };
  }
  const text = normalize(raw);
  if (text.length < POLICY_TEXT_MIN_CHARS) {
    return {
      ok: false,
      error: "Paste a few sentences of your price-protection terms.",
    };
  }
  if (text.length > POLICY_TEXT_MAX_CHARS) {
    return {
      ok: false,
      error: `Keep the policy under ${POLICY_TEXT_MAX_CHARS} characters.`,
    };
  }
  if (JAILBREAK.test(text)) {
    return {
      ok: false,
      error: "PayZap only reads price-protection terms.",
    };
  }
  if (!POLICY_WORD.test(text)) {
    return {
      ok: false,
      error: "That does not look like price-protection terms. PayZap does not answer other requests.",
    };
  }
  return { ok: true, prompt: text };
}

/** Limits how often one demo session can spend a model call compiling a policy. */
export function takePolicyTurn(sessionId: string): PromptReview {
  const now = Date.now();
  const current = policyTurns.get(sessionId) ?? { count: 0, lastAt: 0 };

  if (now - current.lastAt < MIN_GAP_MS) {
    return {
      ok: false,
      error: "PayZap is still reading your last policy. Wait a moment, then try again.",
    };
  }
  if (current.count >= MAX_POLICY_COMPILES_PER_SESSION) {
    return {
      ok: false,
      error: "This demo can read a few policies. Reset the scenario to start over.",
    };
  }

  policyTurns.set(sessionId, { count: current.count + 1, lastAt: now });
  return { ok: true, prompt: "" };
}

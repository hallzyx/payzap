import {
  CAMPAIGN_PROMPT_MAX_CHARS,
  DEFAULT_PROMO_PROMPT,
} from "@/lib/constants";

const MAX_WORDS = 45;
const MAX_ANALYSES_PER_SESSION = 6;
const MIN_GAP_MS = 3_000;

const turns = new Map<string, { count: number; lastAt: number }>();

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

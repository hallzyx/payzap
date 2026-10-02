import type { CampaignIntent } from "@/lib/types";
import { parseUsdToCents } from "@/lib/money";

const DEFAULT_PROMPT =
  "Launch a weekend campaign at $800, but keep total price-protection refunds under $1,500.";

export function extractCampaignIntentDeterministic(
  prompt: string,
): CampaignIntent | null {
  const text = prompt.trim();
  if (!text) return null;

  const priceMatch =
    text.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/gi) ??
    text.match(/(?:at|to|price)\s+\$?\s*([\d,]+)/gi);

  const numbers: number[] = [];
  const dollarMatches = text.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/g) ?? [];
  for (const m of dollarMatches) {
    const cents = parseUsdToCents(m);
    if (cents !== null) numbers.push(cents);
  }

  if (numbers.length === 0) {
    const fallback = text.match(/(\d{3,4})/g);
    if (fallback) {
      for (const n of fallback) {
        const cents = parseUsdToCents(n);
        if (cents !== null) numbers.push(cents);
      }
    }
  }

  if (numbers.length === 0) return null;

  const proposedPriceCents = numbers[0];
  let refundBudgetCents: number | null = null;

  const underMatch = text.match(/under\s+\$?\s*([\d,]+)/i);
  if (underMatch) {
    refundBudgetCents = parseUsdToCents(underMatch[1]);
  } else if (numbers.length >= 2) {
    refundBudgetCents = numbers[1];
  }

  return {
    proposedPriceCents,
    refundBudgetCents,
    rawPrompt: text,
    source: "deterministic",
  };
}

export async function extractCampaignIntent(
  prompt: string,
): Promise<CampaignIntent | null> {
  const trimmed = prompt.trim() || DEFAULT_PROMPT;
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'Extract promotional price and max refund budget in USD from the merchant prompt. Return JSON: {"proposedPriceDollars": number, "refundBudgetDollars": number|null}',
            },
            { role: "user", content: trimmed },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as {
            proposedPriceDollars?: number;
            refundBudgetDollars?: number | null;
          };
          const proposed = parseUsdToCents(parsed.proposedPriceDollars ?? 0);
          if (proposed !== null) {
            const budget =
              parsed.refundBudgetDollars != null
                ? parseUsdToCents(parsed.refundBudgetDollars)
                : null;
            return {
              proposedPriceCents: proposed,
              refundBudgetCents: budget,
              rawPrompt: trimmed,
              source: "llm",
            };
          }
        }
      }
    } catch {
      /* fall through */
    }
  }

  return extractCampaignIntentDeterministic(trimmed);
}

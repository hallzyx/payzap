import { NextResponse } from "next/server";
import { computeExposure } from "@/lib/campaign/exposure";
import { extractCampaignIntent } from "@/lib/campaign/intent";
import {
  buildDemoState,
  getSessionById,
  saveAnalysis,
} from "@/lib/session/repository";
import { getSessionIdFromCookies } from "@/lib/session/cookies";
import { DEFAULT_PROMO_PROMPT } from "@/lib/constants";

export async function POST(req: Request) {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  const session = getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.expires_at && new Date(session.expires_at) <= new Date()) {
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }
  if (session.campaign_status !== "idle" && session.campaign_status !== "analyzed") {
    return NextResponse.json(
      { error: "Campaign is already past analysis. Reset the scenario to plan again." },
      { status: 409 },
    );
  }

  const body = (await req.json()) as { prompt?: string };
  const prompt = body.prompt?.trim() || DEFAULT_PROMO_PROMPT;
  const intent = await extractCampaignIntent(prompt);
  if (!intent) {
    return NextResponse.json(
      { error: "Could not read campaign price and budget. Edit your prompt." },
      { status: 400 },
    );
  }

  const state = buildDemoState(session);
  const exposure = computeExposure({
    proposedPriceCents: intent.proposedPriceCents,
    refundBudgetCents: intent.refundBudgetCents,
    eligibleCount: state.orders.length,
  });

  saveAnalysis(sessionId, {
    proposedPriceCents: intent.proposedPriceCents,
    refundBudgetCents: intent.refundBudgetCents,
    recommendedPriceCents: exposure.recommendedPriceCents,
    analyzedPrompt: prompt,
  });

  const updated = getSessionById(sessionId)!;
  return NextResponse.json({ state: buildDemoState(updated), intent, exposure });
}

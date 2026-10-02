import { NextResponse } from "next/server";
import { computeExposure } from "@/lib/campaign/exposure";
import { reviewCampaignPrompt, takeAnalysisTurn } from "@/lib/campaign/guard";
import { extractCampaignIntent } from "@/lib/campaign/intent";
import {
  buildDemoState,
  getSessionById,
  saveAnalysis,
} from "@/lib/session/repository";
import { getSessionIdFromCookies } from "@/lib/session/cookies";

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

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 2_000) {
    return NextResponse.json(
      { error: "Keep the campaign to one short sentence with a price and a refund budget." },
      { status: 400 },
    );
  }

  let body: { prompt?: unknown };
  try {
    body = (await req.json()) as { prompt?: unknown };
  } catch {
    return NextResponse.json(
      { error: "PayZap only reads a sale price and a refund budget." },
      { status: 400 },
    );
  }
  if (body.prompt != null && typeof body.prompt !== "string") {
    return NextResponse.json(
      { error: "PayZap only reads a sale price and a refund budget." },
      { status: 400 },
    );
  }

  const reviewed = reviewCampaignPrompt(
    typeof body.prompt === "string" ? body.prompt : undefined,
  );
  if (!reviewed.ok) {
    return NextResponse.json({ error: reviewed.error }, { status: 400 });
  }
  const prompt = reviewed.prompt;

  if (
    session.campaign_status === "analyzed" &&
    session.analyzed_prompt === prompt
  ) {
    return NextResponse.json({ state: buildDemoState(session) });
  }

  const turn = takeAnalysisTurn(sessionId);
  if (!turn.ok) {
    return NextResponse.json({ error: turn.error }, { status: 429 });
  }

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

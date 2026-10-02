import { NextResponse } from "next/server";
import { acceptRecommendation, launchCampaign } from "@/lib/campaign/launch";
import {
  buildDemoState,
  getSessionById,
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

  const body = (await req.json()) as { action: "accept" | "launch" };
  if (body.action === "accept") {
    const result = acceptRecommendation(session);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } else if (body.action === "launch") {
    const result = await launchCampaign(sessionId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const updated = getSessionById(sessionId)!;
  return NextResponse.json({ state: buildDemoState(updated) });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptRecommendation, launchCampaign } from "@/lib/campaign/launch";
import {
  buildDemoState,
  getSessionById,
} from "@/lib/session/repository";
import { getSessionIdFromCookies } from "@/lib/session/cookies";

// Refunds run in after(); this keeps the invocation alive long enough for them.
export const maxDuration = 60;

const bodySchema = z.object({ action: z.enum(["accept", "launch"]) });

export async function POST(req: Request) {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  const session = getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (parsed.data.action === "accept") {
    const result = acceptRecommendation(session);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } else {
    const result = await launchCampaign(sessionId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  const updated = getSessionById(sessionId)!;
  return NextResponse.json({ state: buildDemoState(updated) });
}

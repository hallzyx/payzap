import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAmbiguity } from "@/lib/policy/validate";
import {
  buildDemoState,
  clearAnalysis,
  getPolicyForSession,
  getSessionById,
  savePolicy,
} from "@/lib/session/repository";
import { getSessionIdFromCookies } from "@/lib/session/cookies";

const bodySchema = z.object({
  ambiguityId: z.string().min(1).max(40),
  optionId: z.string().min(1).max(40),
});

const LOCKED_STATUSES = ["approved", "refunding", "completed", "partial_failure"];

export async function POST(req: Request) {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  const session = getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (new Date(session.expires_at) <= new Date()) {
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }
  if (LOCKED_STATUSES.includes(session.campaign_status)) {
    return NextResponse.json(
      { error: "The campaign already launched. Reset the scenario to change the policy." },
      { status: 409 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const body = bodySchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json({ error: "Choose an answer." }, { status: 400 });
  }

  const next = resolveAmbiguity(
    getPolicyForSession(session),
    body.data.ambiguityId,
    body.data.optionId,
  );
  if (!next) {
    return NextResponse.json({ error: "That question is no longer open." }, { status: 400 });
  }

  savePolicy(sessionId, next, session.policy_text);
  clearAnalysis(sessionId);
  return NextResponse.json({ state: buildDemoState(getSessionById(sessionId)!) });
}

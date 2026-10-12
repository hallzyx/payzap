import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewPolicyText, takePolicyTurn } from "@/lib/campaign/guard";
import { compilePolicy } from "@/lib/policy/compile";
import { DEFAULT_POLICY } from "@/lib/policy/schema";
import {
  buildDemoState,
  clearAnalysis,
  getSessionById,
  savePolicy,
} from "@/lib/session/repository";
import { getSessionIdFromCookies } from "@/lib/session/cookies";

const bodySchema = z.object({
  text: z.string().max(5_000).optional(),
  /** true restores the built-in default policy. */
  useDefault: z.boolean().optional(),
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
    return NextResponse.json({ error: "Paste your policy as text." }, { status: 400 });
  }

  if (body.data.useDefault) {
    savePolicy(sessionId, DEFAULT_POLICY, null);
    clearAnalysis(sessionId);
    return NextResponse.json({ state: buildDemoState(getSessionById(sessionId)!) });
  }

  const reviewed = reviewPolicyText(body.data.text);
  if (!reviewed.ok) {
    return NextResponse.json({ error: reviewed.error }, { status: 400 });
  }
  const text = reviewed.prompt;

  if (session.policy_text === text) {
    return NextResponse.json({ state: buildDemoState(session) });
  }

  const turn = takePolicyTurn(sessionId);
  if (!turn.ok) {
    return NextResponse.json({ error: turn.error }, { status: 429 });
  }

  const policy = await compilePolicy(text);
  if (!policy) {
    return NextResponse.json(
      { error: "PayZap could not find price-protection rules in that text. Edit it and try again." },
      { status: 400 },
    );
  }

  savePolicy(sessionId, policy, text);
  clearAnalysis(sessionId);
  return NextResponse.json({ state: buildDemoState(getSessionById(sessionId)!) });
}

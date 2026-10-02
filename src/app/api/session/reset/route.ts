import { NextResponse } from "next/server";
import {
  buildDemoState,
  getSessionById,
  resetScenario,
} from "@/lib/session/repository";
import { getSessionIdFromCookies } from "@/lib/session/cookies";

export async function POST() {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  resetScenario(sessionId);
  const session = getSessionById(sessionId);
  return NextResponse.json({
    state: session ? buildDemoState(session) : null,
  });
}

import { NextResponse } from "next/server";
import {
  buildDemoState,
  getSessionById,
  startFreshLiveRun,
} from "@/lib/session/repository";
import { getSessionIdFromCookies } from "@/lib/session/cookies";

export async function POST() {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  const result = startFreshLiveRun(sessionId);
  if (!result.ok) {
    const status = result.error === "Session expired" ? 410 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  const session = getSessionById(sessionId);
  return NextResponse.json({
    state: session ? buildDemoState(session) : null,
    preview: result.preview,
  });
}

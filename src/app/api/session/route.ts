import { NextResponse } from "next/server";
import {
  buildDemoState,
  createDemoSession,
  getSessionById,
} from "@/lib/session/repository";
import {
  getSessionIdFromCookies,
  setSessionCookie,
} from "@/lib/session/cookies";

export async function GET() {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    return NextResponse.json({ session: null });
  }
  const session = getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ session: null });
  }
  return NextResponse.json({ state: buildDemoState(session) });
}

export async function POST() {
  const session = createDemoSession();
  await setSessionCookie(session.id, new Date(session.expires_at));
  return NextResponse.json({ state: buildDemoState(session) });
}

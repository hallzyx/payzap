import { NextResponse } from "next/server";
import {
  buildDemoState,
  createDemoSession,
  getSessionById,
} from "@/lib/session/repository";
import {
  getSessionIdFromCookies,
  getWatchIdFromCookies,
  setSessionCookie,
} from "@/lib/session/cookies";
import { ensureReadyLiveBatch } from "@/lib/paypal/provision";
import { claimPaypalTraces } from "@/lib/paypal/trace";

export const maxDuration = 60;

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
  const watchId = await getWatchIdFromCookies();
  const provision = await ensureReadyLiveBatch({ watchId });
  const session = createDemoSession();
  claimPaypalTraces({
    watchId,
    sessionId: session.id,
    batchId: session.batch_id,
  });
  await setSessionCookie(session.id, new Date(session.expires_at));
  return NextResponse.json({
    state: buildDemoState(session),
    provisionError: provision.status === "failed" ? provision.error : undefined,
  });
}

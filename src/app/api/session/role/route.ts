import { NextResponse } from "next/server";
import {
  buildDemoState,
  getSessionById,
  setSessionRole,
} from "@/lib/session/repository";
import { getSessionIdFromCookies } from "@/lib/session/cookies";

export async function POST(req: Request) {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  const body = (await req.json()) as { role?: "buyer" | "merchant" };
  if (body.role) {
    setSessionRole(sessionId, body.role);
  }
  const session = getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ state: buildDemoState(session) });
}

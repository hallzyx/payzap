import { NextResponse } from "next/server";
import { retryOrderRefund } from "@/lib/campaign/launch";
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
  const body = (await req.json()) as { orderId: string };
  const result = await retryOrderRefund(sessionId, body.orderId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const session = getSessionById(sessionId)!;
  return NextResponse.json({ state: buildDemoState(session) });
}

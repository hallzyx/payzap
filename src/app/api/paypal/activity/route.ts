import { NextResponse } from "next/server";
import { readPaypalActivity } from "@/lib/paypal/trace";
import {
  getSessionIdFromCookies,
  getWatchIdFromCookies,
} from "@/lib/session/cookies";

export async function GET() {
  const [sessionId, watchId] = await Promise.all([
    getSessionIdFromCookies(),
    getWatchIdFromCookies(),
  ]);
  const activity = readPaypalActivity({ sessionId, watchId });
  return NextResponse.json(activity, {
    headers: { "Cache-Control": "no-store" },
  });
}

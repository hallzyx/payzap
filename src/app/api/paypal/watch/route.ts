import { NextResponse } from "next/server";
import { newId } from "@/lib/ids";
import { setWatchCookie } from "@/lib/session/cookies";

export async function POST() {
  await setWatchCookie(newId("watch"));
  return NextResponse.json({ ok: true });
}

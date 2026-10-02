import { cookies } from "next/headers";
import { PAYPAL_WATCH_COOKIE, SESSION_COOKIE } from "@/lib/constants";

export async function getSessionIdFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(sessionId: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getWatchIdFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(PAYPAL_WATCH_COOKIE)?.value ?? null;
}

export async function setWatchCookie(watchId: string) {
  const store = await cookies();
  store.set(PAYPAL_WATCH_COOKIE, watchId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
}

import { ORIGINAL_PRICE_CENTS, PROTECTED_ORDER_COUNT } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { newId, nowIso } from "@/lib/ids";
import { createSandboxCapture, paypalSandbox } from "@/lib/paypal/client";
import type { PaypalCallScope } from "@/lib/paypal/trace";

export type ProvisionResult =
  | { status: "skipped" }
  | { status: "ready" }
  | { status: "failed"; error: string };

function hasReadyLiveBatch(): boolean {
  const row = getDb()
    .prepare(
      `SELECT id FROM paypal_batches
       WHERE status = 'Ready' AND capture_ids_json NOT LIKE '%SANDBOX-CAP-%'
       LIMIT 1`,
    )
    .get();
  return Boolean(row);
}

async function mintCaptures(
  count: number,
  amount: string,
  scope: PaypalCallScope,
): Promise<string[]> {
  const ids: string[] = [];
  let lastError = "PayPal Sandbox could not open the demo captures.";

  for (let attempt = 0; attempt < 2 && ids.length < count; attempt++) {
    const missing = count - ids.length;
    const settled = await Promise.allSettled(
      Array.from({ length: missing }, () => createSandboxCapture(amount, scope)),
    );
    let authFailure = false;
    for (const result of settled) {
      if (result.status === "fulfilled") ids.push(result.value);
      else {
        lastError =
          result.reason instanceof Error
            ? result.reason.message
            : lastError;
        if (/rejected the app credentials|same value|Card Payments/i.test(lastError)) {
          authFailure = true;
        }
      }
    }
    if (authFailure) break;
  }

  if (ids.length < count) {
    throw new Error(lastError);
  }
  return ids.slice(0, count);
}

/** Creates a Ready batch of real Sandbox captures when the demo is about to start. */
export async function ensureReadyLiveBatch(
  scope: PaypalCallScope = {},
): Promise<ProvisionResult> {
  if (!paypalSandbox()) return { status: "skipped" };

  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (clientId && secret && clientId === secret) {
    return {
      status: "failed",
      error:
        "PayPal Client ID and Secret are the same value. In the Sandbox app, copy the Secret separately from the Client ID, then generate the demo again.",
    };
  }

  if (hasReadyLiveBatch()) return { status: "ready" };

  const amount = (ORIGINAL_PRICE_CENTS / 100).toFixed(2);
  const batchId = newId("batch");
  try {
    const ids = await mintCaptures(PROTECTED_ORDER_COUNT, amount, { ...scope, batchId });
    const ts = nowIso();
    getDb()
      .prepare(
        `INSERT INTO paypal_batches (id, status, capture_ids_json, reserved_session_id, created_at, updated_at)
         VALUES (?, 'Ready', ?, NULL, ?, ?)`,
      )
      .run(batchId, JSON.stringify(ids), ts, ts);
    return { status: "ready" };
  } catch (err) {
    return {
      status: "failed",
      error:
        err instanceof Error
          ? err.message
          : "PayPal Sandbox could not open the demo captures.",
    };
  }
}

import { getDb } from "@/lib/db";
import { newId, nowIso } from "@/lib/ids";
import { PROTECTED_ORDER_COUNT } from "@/lib/constants";

const PAYPAL_API =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error("Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET");
  }
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`OAuth failed: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Import capture IDs from PAYPAL_CAPTURE_IDS (comma-separated, 10+ IDs)
 * or pass them in data/paypal-captures.json manually after creating captures in Sandbox.
 */
async function main() {
  const envIds = process.env.PAYPAL_CAPTURE_IDS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (!envIds?.length) {
    console.log(
      "Set PAYPAL_CAPTURE_IDS with 10 comma-separated Sandbox capture IDs, or edit data/paypal-captures.json.",
    );
    console.log("OAuth check only...");
    await getAccessToken();
    console.log("PayPal credentials OK.");
    return;
  }

  if (envIds.length < PROTECTED_ORDER_COUNT) {
    throw new Error(`Need at least ${PROTECTED_ORDER_COUNT} capture IDs`);
  }

  const db = getDb();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO paypal_batches (id, status, capture_ids_json, reserved_session_id, created_at, updated_at)
     VALUES (?, 'Ready', ?, NULL, ?, ?)`,
  ).run(newId("batch"), JSON.stringify(envIds.slice(0, PROTECTED_ORDER_COUNT)), ts, ts);

  console.log("Inserted batch from PAYPAL_CAPTURE_IDS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

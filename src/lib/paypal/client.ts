const PAYPAL_API =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) return null;

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  }).catch(() => null);

  if (!res?.ok) return null;
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface RefundResult {
  ok: boolean;
  refundId?: string;
  error?: string;
  simulated?: boolean;
}

export async function refundCapturePartial(params: {
  captureId: string;
  amountCents: number;
  currency?: string;
  idempotencyKey: string;
  allowSimulate?: boolean;
}): Promise<RefundResult> {
  const token = await getAccessToken();
  const amount = (params.amountCents / 100).toFixed(2);
  const currency = params.currency ?? "USD";

  if (!token) {
    if (params.allowSimulate && params.captureId.startsWith("SANDBOX-CAP-")) {
      await delay(400);
      return {
        ok: true,
        refundId: `SIM-${params.idempotencyKey.slice(0, 12)}`,
        simulated: true,
      };
    }
    return { ok: false, error: "PayPal credentials unavailable" };
  }

  const res = await fetch(
    `${PAYPAL_API}/v2/payments/captures/${params.captureId}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": params.idempotencyKey,
      },
      body: JSON.stringify({
        amount: { value: amount, currency_code: currency },
        note_to_payer: "PayZap price protection adjustment",
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text.slice(0, 200) };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, refundId: data.id };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

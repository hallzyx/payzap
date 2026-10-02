import { recordPaypalTrace, type PaypalCallScope } from "@/lib/paypal/trace";

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
  scope?: PaypalCallScope;
}): Promise<RefundResult> {
  const token = await getAccessToken();
  const amount = (params.amountCents / 100).toFixed(2);
  const currency = params.currency ?? "USD";
  const path = `/v2/payments/captures/${params.captureId}/refund`;

  if (!token) {
    if (params.allowSimulate && params.captureId.startsWith("SANDBOX-CAP-")) {
      await delay(400);
      const refundId = `SIM-${params.idempotencyKey.slice(0, 12)}`;
      rememberCall({
        scope: params.scope,
        kind: "refund",
        path,
        statusCode: null,
        ok: true,
        simulated: true,
        amount,
        currency,
        captureId: params.captureId,
        refundId,
        summary: "Preview only. Not sent to PayPal.",
        durationMs: 400,
      });
      return { ok: true, refundId, simulated: true };
    }
    return { ok: false, error: "PayPal credentials unavailable" };
  }

  const started = Date.now();
  const res = await fetch(`${PAYPAL_API}${path}`, {
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
  });

  if (!res.ok) {
    const text = await res.text();
    const error = paypalErrorMessage(text);
    rememberCall({
      scope: params.scope,
      kind: "refund",
      path,
      statusCode: res.status,
      ok: false,
      amount,
      currency,
      captureId: params.captureId,
      summary: error,
      durationMs: Date.now() - started,
    });
    return { ok: false, error: text.slice(0, 200) };
  }

  const data = (await res.json()) as { id?: string };
  rememberCall({
    scope: params.scope,
    kind: "refund",
    path,
    statusCode: res.status,
    ok: true,
    amount,
    currency,
    captureId: params.captureId,
    refundId: data.id ?? null,
    summary: "COMPLETED",
    durationMs: Date.now() - started,
  });
  return { ok: true, refundId: data.id };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function rememberCall(input: Parameters<typeof recordPaypalTrace>[0]) {
  try {
    recordPaypalTrace(input);
  } catch {
    /* The scanner is read-only. A log failure must not stop the payment. */
  }
}

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export function paypalSandbox(): boolean {
  return paypalConfigured() && process.env.PAYPAL_MODE !== "live";
}

type PaypalOrder = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id?: string; status?: string }>;
    };
  }>;
};

function completedCaptureId(order: PaypalOrder): string | null {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture?.id || capture.status !== "COMPLETED") return null;
  return capture.id;
}

export function paypalErrorMessage(body: string): string {
  try {
    const data = JSON.parse(body) as {
      error?: string;
      error_description?: string;
      message?: string;
      details?: Array<{ issue?: string; description?: string }>;
    };
    if (data.error === "invalid_client") {
      return "PayPal Sandbox rejected the app credentials. Use the Sandbox Client ID and the separate Secret from the same app.";
    }
    const issue = data.details?.[0]?.issue;
    const description = data.details?.[0]?.description ?? data.message;
    if (
      issue === "NOT_ENABLED_FOR_CARD_PROCESSING" ||
      issue === "PAYEE_NOT_ENABLED_FOR_CARD_PROCESSING"
    ) {
      return "Turn on Advanced Credit and Debit Card Payments for this Sandbox app, then generate the demo again.";
    }
    if (description) return description;
  } catch {
    /* PayPal sometimes returns plain text */
  }
  return "PayPal Sandbox could not open the demo captures.";
}

/**
 * Opens one completed Sandbox sale and returns its capture id.
 * Uses PayPal's public sandbox test card so the buyer never has to approve a checkout.
 */
export async function createSandboxCapture(
  amount: string,
  scope: PaypalCallScope = {},
): Promise<string> {
  if (!paypalSandbox()) {
    throw new Error("Automatic captures run only with PayPal Sandbox credentials.");
  }
  const token = await getAccessToken();
  if (!token) {
    throw new Error(
      "PayPal Sandbox rejected the app credentials. Use the Sandbox Client ID and the separate Secret from the same app.",
    );
  }

  const requestId = `payzap-${crypto.randomUUID()}`;
  const started = Date.now();
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": requestId,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      payment_source: {
        card: {
          number: "4032039312430699",
          expiry: "2030-12",
          security_code: "123",
          name: "Sandbox Buyer",
          billing_address: {
            address_line_1: "123 Main St",
            admin_area_2: "San Jose",
            admin_area_1: "CA",
            postal_code: "95131",
            country_code: "US",
          },
        },
      },
      purchase_units: [
        {
          description: "Aster Nova Pro",
          custom_id: "payzap-demo",
          amount: { currency_code: "USD", value: amount },
        },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    rememberCall({
      scope,
      kind: "sale",
      path: "/v2/checkout/orders",
      statusCode: res.status,
      ok: false,
      amount,
      summary: paypalErrorMessage(text),
      durationMs: Date.now() - started,
    });
    throw new Error(paypalErrorMessage(text));
  }

  let order = JSON.parse(text) as PaypalOrder;
  const immediate = completedCaptureId(order);
  rememberCall({
    scope,
    kind: "sale",
    path: "/v2/checkout/orders",
    statusCode: res.status,
    ok: true,
    amount,
    captureId: immediate,
    summary: immediate ? "COMPLETED" : order.status ?? "CREATED",
    durationMs: Date.now() - started,
  });
  if (immediate) return immediate;

  if (!order.id) {
    throw new Error("PayPal Sandbox did not return a completed capture.");
  }

  const captureStarted = Date.now();
  const capturePath = `/v2/checkout/orders/${order.id}/capture`;
  const captured = await fetch(`${PAYPAL_API}${capturePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `${requestId}-capture`,
      Prefer: "return=representation",
    },
  });
  const capturedText = await captured.text();
  if (!captured.ok) {
    rememberCall({
      scope,
      kind: "sale",
      path: capturePath,
      statusCode: captured.status,
      ok: false,
      amount,
      summary: paypalErrorMessage(capturedText),
      durationMs: Date.now() - captureStarted,
    });
    throw new Error(paypalErrorMessage(capturedText));
  }
  order = JSON.parse(capturedText) as PaypalOrder;
  const id = completedCaptureId(order);
  if (id) {
    rememberCall({
      scope,
      kind: "sale",
      path: capturePath,
      statusCode: captured.status,
      ok: true,
      amount,
      captureId: id,
      summary: "COMPLETED",
      durationMs: Date.now() - captureStarted,
    });
    return id;
  }

  if (order.status === "PAYER_ACTION_REQUIRED") {
    throw new Error(
      "PayPal Sandbox asked the buyer to approve the payment. Turn on Advanced Credit and Debit Card Payments for this app, then generate the demo again.",
    );
  }
  throw new Error("PayPal Sandbox did not return a completed capture.");
}

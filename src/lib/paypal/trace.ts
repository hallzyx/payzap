import { getDb } from "@/lib/db";
import { newId, nowIso } from "@/lib/ids";
import { getOrdersForSession, getSessionById } from "@/lib/session/repository";
import type { OrderRow, SessionRow } from "@/lib/types";

export type PaypalCallScope = {
  watchId?: string | null;
  sessionId?: string | null;
  batchId?: string | null;
};

type TraceRow = {
  id: string;
  session_id: string | null;
  watch_id: string | null;
  batch_id: string | null;
  kind: "sale" | "refund";
  method: string;
  path: string;
  status_code: number | null;
  ok: number;
  simulated: number;
  observed: number;
  amount: string | null;
  currency: string | null;
  capture_id: string | null;
  refund_id: string | null;
  summary: string | null;
  duration_ms: number | null;
  seq: number;
  created_at: string;
};

export type PaypalCallView = {
  id: string;
  kind: "sale" | "refund";
  method: string;
  path: string;
  statusCode: number | null;
  ok: boolean;
  simulated: boolean;
  observed: boolean;
  amount: string | null;
  currency: string | null;
  captureId: string | null;
  refundId: string | null;
  summary: string | null;
  durationMs: number | null;
  createdAt: string;
  buyerName: string | null;
  orderNumber: string | null;
  isDemoBuyer: boolean;
};

let seqTick = 0;

function nextSeq(): number {
  seqTick = (seqTick + 1) % 1000;
  return Date.now() * 1000 + seqTick;
}

function safeSummary(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.replace(/\b\d{12,19}\b/g, "[redacted]").slice(0, 180);
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function isSyntheticCapture(id: string | null): boolean {
  return !id || id.startsWith("SANDBOX-CAP-");
}

function isSyntheticRefund(id: string | null): boolean {
  return !id || id.startsWith("SIM-") || id.startsWith("PREVIEW-");
}

/** Stores the shape of a PayPal call. Cards, secrets, and request bodies stay out. */
export function recordPaypalTrace(input: {
  scope?: PaypalCallScope;
  kind: "sale" | "refund";
  method?: string;
  path: string;
  statusCode: number | null;
  ok: boolean;
  simulated?: boolean;
  observed?: boolean;
  amount?: string | null;
  currency?: string | null;
  captureId?: string | null;
  refundId?: string | null;
  summary?: string | null;
  durationMs?: number | null;
  seq?: number;
  createdAt?: string;
}): void {
  const path = input.path.startsWith("/v2/") ? input.path.slice(0, 180) : "/v2/payments";
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO paypal_traces (
        id, session_id, watch_id, batch_id, kind, method, path, status_code, ok,
        simulated, observed, amount, currency, capture_id, refund_id, summary,
        duration_ms, seq, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId("trace"),
      input.scope?.sessionId ?? null,
      input.scope?.watchId ?? null,
      input.scope?.batchId ?? null,
      input.kind,
      input.method ?? "POST",
      path,
      input.statusCode,
      input.ok ? 1 : 0,
      input.simulated ? 1 : 0,
      input.observed === false ? 0 : 1,
      input.amount ?? null,
      input.currency ?? "USD",
      input.captureId ?? null,
      input.refundId ?? null,
      safeSummary(input.summary),
      input.durationMs ?? null,
      input.seq ?? nextSeq(),
      input.createdAt ?? nowIso(),
    );
}

export function claimPaypalTraces(opts: {
  watchId?: string | null;
  sessionId: string;
  batchId?: string | null;
}) {
  const db = getDb();
  if (opts.watchId) {
    db.prepare(
      `UPDATE paypal_traces SET session_id = ? WHERE session_id IS NULL AND watch_id = ?`,
    ).run(opts.sessionId, opts.watchId);
  }
  if (opts.batchId) {
    db.prepare(
      `UPDATE paypal_traces SET session_id = ? WHERE session_id IS NULL AND batch_id = ?`,
    ).run(opts.sessionId, opts.batchId);
  }
}

function backfillSession(session: SessionRow, orders: OrderRow[]) {
  orders.forEach((order, index) => {
    if (isSyntheticCapture(order.paypal_capture_id)) return;
    const saleAt = new Date(order.created_at).getTime();
    recordPaypalTrace({
      scope: { sessionId: session.id, batchId: session.batch_id },
      kind: "sale",
      path: "/v2/checkout/orders",
      statusCode: null,
      ok: true,
      observed: false,
      amount: dollars(order.purchase_price_cents),
      captureId: order.paypal_capture_id,
      summary: "COMPLETED",
      seq: saleAt * 1000 + index * 10,
      createdAt: order.created_at,
    });

    if (order.refund_status !== "completed" || isSyntheticRefund(order.paypal_refund_id)) {
      return;
    }
    recordPaypalTrace({
      scope: { sessionId: session.id, batchId: session.batch_id },
      kind: "refund",
      path: `/v2/payments/captures/${order.paypal_capture_id}/refund`,
      statusCode: null,
      ok: true,
      observed: false,
      amount: dollars(order.price_adjustment_cents),
      captureId: order.paypal_capture_id,
      refundId: order.paypal_refund_id,
      summary: "COMPLETED",
      seq: new Date(session.updated_at).getTime() * 1000 + index,
      createdAt: session.updated_at,
    });
  });
}

function decorate(rows: TraceRow[], orders: OrderRow[]): PaypalCallView[] {
  const byCapture = new Map(
    orders
      .filter((order) => order.paypal_capture_id)
      .map((order) => [order.paypal_capture_id as string, order]),
  );
  return rows.map((row) => {
    const order = row.capture_id ? byCapture.get(row.capture_id) : undefined;
    return {
      id: row.id,
      kind: row.kind,
      method: row.method,
      path: row.path,
      statusCode: row.status_code,
      ok: row.ok === 1,
      simulated: row.simulated === 1,
      observed: row.observed === 1,
      amount: row.amount,
      currency: row.currency,
      captureId: row.capture_id,
      refundId: row.refund_id,
      summary: row.summary,
      durationMs: row.duration_ms,
      createdAt: row.created_at,
      buyerName: order?.buyer_name ?? null,
      orderNumber: order?.order_number ?? null,
      isDemoBuyer: order?.is_demo_buyer === 1,
    };
  });
}

function listInflight(watchId: string): TraceRow[] {
  const cutoff = Date.now() - 3 * 60 * 1000;
  const rows = getDb()
    .prepare(
      `SELECT * FROM paypal_traces
       WHERE watch_id = ? AND session_id IS NULL
       ORDER BY seq ASC`,
    )
    .all(watchId) as TraceRow[];
  return rows.filter((row) => new Date(row.created_at).getTime() >= cutoff);
}

export function readPaypalActivity(opts: {
  sessionId: string | null;
  watchId: string | null;
}): {
  host: string;
  preview: boolean;
  inflight: boolean;
  calls: PaypalCallView[];
} {
  const host =
    process.env.PAYPAL_MODE === "live" ? "api-m.paypal.com" : "api-m.sandbox.paypal.com";

  if (opts.watchId) {
    const inflight = listInflight(opts.watchId);
    if (inflight.length > 0) {
      return { host, preview: false, inflight: true, calls: decorate(inflight, []) };
    }
  }

  if (!opts.sessionId) {
    return { host, preview: false, inflight: false, calls: [] };
  }

  const session = getSessionById(opts.sessionId);
  if (!session) {
    return { host, preview: false, inflight: false, calls: [] };
  }

  const orders = getOrdersForSession(session.id);
  backfillSession(session, orders);
  const rows = getDb()
    .prepare(`SELECT * FROM paypal_traces WHERE session_id = ? ORDER BY seq ASC`)
    .all(session.id) as TraceRow[];

  return {
    host,
    preview: session.is_preview === 1,
    inflight: false,
    calls: decorate(rows, orders),
  };
}

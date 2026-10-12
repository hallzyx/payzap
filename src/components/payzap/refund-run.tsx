"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { Money, RefundPill, Spinner } from "@/components/live/primitives";
import { refundIsSimulated } from "@/lib/live";
import { formatUsd } from "@/lib/money";
import type { OrderView } from "@/lib/types";

function ruleLine(order: OrderView): { label: string; cite: string | null } | null {
  const checks = order.eligibility?.checks ?? [];
  const failed = checks.find((c) => !c.passed);
  if (failed) return { label: failed.label, cite: failed.cite ?? null };
  const window = checks.find((c) => c.ruleId && c.label.startsWith("Within"));
  if (!window) return null;
  return { label: window.label, cite: window.cite ?? null };
}

/**
 * Order-by-order refund execution. Status, amounts and refund ids are the
 * session's real values; the policy line is the stored eligibility result
 * that authorized (or blocked) each refund.
 */
export function RefundRun() {
  const { state, refresh, activity } = useDemo();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  if (!state) return null;
  const { session, orders, metrics } = state;
  const status = session.campaignStatus;
  if (!["approved", "refunding", "completed", "partial_failure"].includes(status)) return null;

  const target = orders.filter((o) => o.refundStatus !== "skipped").length;
  const settled = orders.filter((o) => ["completed", "failed", "skipped"].includes(o.refundStatus)).length;
  const pct = orders.length ? (settled / orders.length) * 100 : 0;
  const running = status === "approved" || status === "refunding";
  const durations = new Map(
    (activity?.calls ?? [])
      .filter((c) => c.kind === "refund" && c.captureId)
      .map((c) => [c.captureId as string, c]),
  );

  async function retry(orderId: string) {
    setRetrying(orderId);
    await fetch("/api/refunds/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    await refresh();
    setRetrying(null);
  }

  return (
    <section className="card-merchant animate-fade-up overflow-hidden" aria-labelledby="run-title">
      <header className="border-b border-[var(--merchant-border)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-[var(--payzap-accent)]">Step 3 · Honor the guarantee</p>
            <h2 id="run-title" className="mt-1 text-lg font-semibold">
              {running
                ? session.isPreview ? "Simulating refunds…" : "Sending refunds to PayPal…"
                : status === "completed"
                  ? `${metrics.completedRefunds} / ${target} refunds completed`
                  : `${metrics.completedRefunds} / ${target} completed · ${metrics.failedRefunds} need a retry`}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--merchant-muted)]">
              {session.isPreview
                ? "Preview mode · simulated refunds, not sent to PayPal"
                : "PayPal Sandbox · POST /v2/payments/captures/{id}/refund · one call per order"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[var(--merchant-muted)]">{session.isPreview ? "Simulated total" : "Refunded through PayPal"}</p>
            <p className="metric-hero text-[var(--ok)]"><Money cents={metrics.totalRefundedCents} /></p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--merchant-border)]">
          <div
            className={`progress-fill h-full ${status === "partial_failure" ? "bg-[var(--warn)]" : "bg-[var(--ok)]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      <ol className="divide-y divide-[var(--merchant-border)]">
        {orders.map((order, i) => {
          const sim = order.refundStatus === "completed" && refundIsSimulated(order);
          const call = order.paypalCaptureId ? durations.get(order.paypalCaptureId) : undefined;
          const rule = ruleLine(order);
          const expanded = open === order.id;
          return (
            <li
              key={order.id}
              className={`${order.refundStatus === "completed" ? "row-flash" : ""} ${
                order.refundStatus === "processing" ? "bg-[var(--payzap-accent-soft)]/50" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : order.id)}
                aria-expanded={expanded}
                className="grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 text-left hover:bg-[var(--merchant-sunken)]"
              >
                <span className="font-mono text-[11px] tabular-nums text-[var(--merchant-muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-mono text-xs">{order.orderNumber}</span>
                    <span className="font-medium">{order.buyerName}</span>
                    {order.isDemoBuyer && (
                      <span className="rounded-full bg-[var(--payzap-accent-soft)] px-1.5 text-[10px] text-[var(--payzap-accent)]">This session</span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--merchant-muted)]">
                    {rule ? (
                      <>
                        {rule.label}
                        {rule.cite && rule.cite !== "Default demo policy" && (
                          <span className="italic text-[var(--ai)]"> · “{rule.cite}”</span>
                        )}
                      </>
                    ) : order.refundStatus === "queued" ? "Waiting in line" : "Evaluating policy…"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {order.refundStatus === "completed" && (
                    <span className="text-sm font-semibold tabular-nums text-[var(--ok)]">
                      −{formatUsd(order.priceAdjustmentCents)}
                    </span>
                  )}
                  {sim && <span className="sim-tag text-[var(--warn)]">Simulated</span>}
                  <RefundPill
                    status={order.refundStatus}
                    label={order.refundStatus === "processing" && session.isPreview ? "Simulating" : undefined}
                  />
                </span>
              </button>
              {(expanded || order.refundStatus === "failed") && (
                <div className="space-y-1 px-5 pb-3 pl-[3.75rem] font-mono text-[11px] text-[var(--merchant-muted)]">
                  {order.paypalCaptureId && <p>capture {order.paypalCaptureId}</p>}
                  {order.paypalRefundId && (
                    <p className="text-[var(--merchant-text)]">
                      refund {order.paypalRefundId}
                      {call?.statusCode ? ` · HTTP ${call.statusCode}` : ""}
                      {call?.durationMs != null ? ` · ${call.durationMs} ms` : ""}
                    </p>
                  )}
                  {order.refundStatus === "failed" && (
                    <p className="flex flex-wrap items-center gap-3 font-sans text-xs text-[var(--risk)]">
                      {order.refundError?.slice(0, 140) ?? "Refund failed"}
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1 text-xs"
                        disabled={retrying != null || status !== "partial_failure"}
                        onClick={() => retry(order.id)}
                      >
                        {retrying === order.id ? <><Spinner /> Retrying…</> : "Retry"}
                      </button>
                    </p>
                  )}
                  {expanded && order.eligibility && (
                    <ul className="mt-2 space-y-0.5 font-sans">
                      {order.eligibility.checks.map((c) => (
                        <li key={c.label} className={c.passed ? "" : "text-[var(--risk)]"}>
                          {c.passed ? "✓" : "✕"} {c.label}
                          {c.cite && c.cite !== "Default demo policy" && (
                            <span className="italic text-[var(--ai)]"> · “{c.cite}”</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {!running && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--merchant-border)] bg-[var(--merchant-sunken)] px-5 py-3 text-xs">
          <span>
            <strong>{metrics.completedRefunds}</strong> refunded ·{" "}
            <strong>{orders.filter((o) => o.refundStatus === "skipped").length}</strong> not covered ·{" "}
            <strong>{metrics.failedRefunds}</strong> failed · no buyer claims needed
          </span>
          <span className="text-[var(--merchant-muted)]">Click any row for its eligibility trail</span>
        </footer>
      )}
    </section>
  );
}

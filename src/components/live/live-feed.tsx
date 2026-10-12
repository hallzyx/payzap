"use client";

import { useMemo } from "react";
import { useDemo, type LiveEvent } from "@/components/demo-provider";
import { useNow } from "@/components/live/use-now";
import { isSimulatedRefundId, timeAgo } from "@/lib/live";
import { formatUsd } from "@/lib/money";

type FeedItem = LiveEvent & { source: "session" | "paypal" | "order" };

const TONE_DOT: Record<LiveEvent["tone"], string> = {
  info: "bg-[var(--merchant-border-strong)]",
  ok: "bg-[var(--ok)]",
  warn: "bg-[var(--accent-amber)]",
  risk: "bg-[var(--risk)]",
  ai: "bg-[var(--ai)]",
};

/**
 * Activity ledger for this session. Every row is real: PayPal calls from the
 * read-only trace log, order payments from the session, and state changes
 * PayZap observed between snapshots.
 */
export function LiveFeed({
  max = 8,
  title = "Live activity",
  className = "",
}: {
  max?: number;
  title?: string;
  className?: string;
}) {
  const { state, events, activity, lastSyncedAt } = useDemo();
  const now = useNow(1000);

  const items = useMemo<FeedItem[]>(() => {
    if (!state) return [];
    const byCapture = new Map(
      state.orders.filter((o) => o.paypalCaptureId).map((o) => [o.paypalCaptureId, o]),
    );
    // A completed refund the PayPal call log already shows is listed once, from the log.
    const loggedOrders = new Set(
      (activity?.calls ?? [])
        .filter((c) => c.kind === "refund" && c.captureId)
        .map((c) => byCapture.get(c.captureId)?.orderNumber),
    );
    const list: FeedItem[] = events
      .filter((e) => !(e.refundEvent && e.orderNumber && loggedOrders.has(e.orderNumber)))
      .map((e) => ({ ...e, source: "session" }));

    for (const call of activity?.calls ?? []) {
      if (call.kind !== "refund") continue;
      const order = call.captureId ? byCapture.get(call.captureId) : undefined;
      const sim = call.simulated || isSimulatedRefundId(call.refundId);
      list.push({
        id: `call-${call.id}`,
        source: "paypal",
        at: new Date(call.createdAt).getTime(),
        tone: call.ok ? "ok" : "risk",
        simulated: sim,
        orderNumber: order?.orderNumber,
        title: call.ok
          ? `${sim ? "Simulated refund" : "PayPal Sandbox refund"} $${call.amount ?? "?"}${
              order ? ` · ${order.buyerName}` : ""
            }`
          : `PayPal refund rejected${order ? ` · ${order.orderNumber}` : ""}`,
        detail: call.ok
          ? `${call.refundId ?? ""}${call.statusCode ? ` · HTTP ${call.statusCode}` : ""}${
              call.durationMs != null ? ` · ${call.durationMs} ms` : ""
            }`
          : call.summary ?? undefined,
      });
    }

    for (const order of state.orders) {
      list.push({
        id: `paid-${order.id}`,
        source: "order",
        at: new Date(order.purchasedAt).getTime(),
        tone: "info",
        orderNumber: order.orderNumber,
        title: `Payment ${formatUsd(order.purchasePriceCents)} · ${order.buyerName}`,
        detail: `${order.orderNumber} · PayPal · price protection active${
          order.isDemoBuyer ? " · this session's buyer" : ""
        }`,
      });
    }

    return list.sort((a, b) => b.at - a.at).slice(0, max);
  }, [state, events, activity, max]);

  const synced = lastSyncedAt ? Math.max(0, Math.round((now - lastSyncedAt) / 1000)) : null;

  return (
    <section className={`card-merchant overflow-hidden ${className}`} aria-live="polite">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--merchant-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ok)] opacity-50" />
            <span className="relative h-2 w-2 rounded-full bg-[var(--ok)]" />
          </span>
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <span className="text-[11px] tabular-nums text-[var(--merchant-muted)]">
          {synced == null ? "connecting…" : synced <= 2 ? "synced just now" : `synced ${synced}s ago`}
        </span>
      </header>
      <ol className="divide-y divide-[var(--merchant-border)]">
        {items.length === 0 && (
          <li className="px-4 py-6 text-xs text-[var(--merchant-muted)]">
            Waiting for the first event…
          </li>
        )}
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex gap-3 px-4 py-2.5 ${now - item.at < 6000 ? "animate-slide-in row-flash" : ""}`}
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-[13px] leading-snug">
                <span className="font-medium">{item.title}</span>
                {item.simulated && <span className="sim-tag text-[var(--warn)]">Simulated</span>}
              </p>
              {item.detail && (
                <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--merchant-muted)]">
                  {item.detail}
                </p>
              )}
            </div>
            <time className="shrink-0 text-[11px] tabular-nums text-[var(--merchant-muted)]">
              {timeAgo(item.at, now)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}

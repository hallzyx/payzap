"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { RefundPill } from "@/components/live/primitives";
import { refundIsSimulated } from "@/lib/live";
import { formatUsd } from "@/lib/money";
import type { OrderView } from "@/lib/types";
import type { PaypalCall } from "@/components/demo-provider";

function when(t: string) {
  return new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function OrderTimeline({
  order,
  calls,
  newPriceCents,
  preview,
}: {
  order: OrderView;
  calls: PaypalCall[];
  newPriceCents: number;
  preview: boolean;
}) {
  const sale = calls.find((c) => c.kind === "sale" && c.captureId === order.paypalCaptureId);
  const refund = calls.find((c) => c.kind === "refund" && c.captureId === order.paypalCaptureId);
  const sim = refundIsSimulated(order);
  const items: Array<{ t?: string; text: string; sub?: string; tone: string }> = [
    {
      t: order.purchasedAt,
      text: `PayPal payment ${formatUsd(order.purchasePriceCents)} captured`,
      sub: order.paypalCaptureId ? `capture ${order.paypalCaptureId}${sale?.observed === false ? " · earlier Sandbox call" : ""}` : "no capture linked",
      tone: "bg-[var(--paypal-navy)]",
    },
    {
      text: `Price protection active until ${when(order.protectionExpiresAt)}`,
      sub: [order.itemCondition === "open_box" ? "open-box" : null, order.couponCode ? `coupon ${order.couponCode}` : null, order.buyerNote].filter(Boolean).join(" · ") || undefined,
      tone: "bg-[var(--accent-amber)]",
    },
  ];
  if (order.eligibility) {
    const failed = order.eligibility.checks.filter((c) => !c.passed);
    items.push({
      text: failed.length ? `PayZap: not covered at ${formatUsd(newPriceCents)}` : `PayZap: eligible at ${formatUsd(newPriceCents)}`,
      sub: failed.length ? failed.map((c) => c.label).join(" · ") : order.eligibility.checks.filter((c) => c.cite && c.cite !== "Default demo policy").map((c) => `“${c.cite}”`).join(" ") || "All policy checks passed",
      tone: failed.length ? "bg-[var(--warn)]" : "bg-[var(--ai)]",
    });
  }
  if (order.refundStatus === "completed") {
    items.push({
      t: refund?.createdAt,
      text: `${sim ? "Simulated refund" : "PayPal partial refund"} −${formatUsd(order.priceAdjustmentCents)}`,
      sub: `${order.paypalRefundId ?? ""}${refund?.statusCode ? ` · HTTP ${refund.statusCode}` : ""}`,
      tone: "bg-[var(--ok)]",
    });
  } else if (order.refundStatus === "failed") {
    items.push({ text: "Refund failed · retry from PayZap", sub: order.refundError?.slice(0, 120) ?? undefined, tone: "bg-[var(--risk)]" });
  } else if (order.refundStatus === "processing") {
    items.push({ text: preview ? "Simulating refund (preview)…" : "Sending refund to PayPal…", tone: "bg-[var(--payzap-accent)] animate-soft-pulse" });
  }

  return (
    <ol className="space-y-2.5 py-1">
      {items.map((it) => (
        <li key={it.text} className="flex gap-3 text-xs">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${it.tone}`} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--merchant-text)]">{it.text}</p>
            {it.sub && <p className="mt-0.5 break-all font-mono text-[11px] text-[var(--merchant-muted)]">{it.sub}</p>}
          </div>
          {it.t && <time className="shrink-0 text-[11px] text-[var(--merchant-muted)]">{when(it.t)}</time>}
        </li>
      ))}
    </ol>
  );
}

export default function MerchantOrdersPage() {
  const { state, activity, setRole } = useDemo();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  if (!state) return null;
  const calls = activity?.calls ?? [];

  return (
    <div className="mx-auto max-w-[1240px]">
      <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-[var(--merchant-muted)]">
        {state.orders.length} PayPal payments with price protection · click an order for its event history
      </p>
      <div className="card-merchant mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[var(--merchant-border)] text-xs uppercase tracking-wide text-[var(--merchant-muted)]">
            <tr>
              <th className="p-4 font-medium">Order</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Paid</th>
              <th className="p-4 font-medium">Adjustment</th>
              <th className="p-4 font-medium">PayPal</th>
            </tr>
          </thead>
          <tbody>
            {state.orders.map((order) => {
              const expanded = open === order.id;
              const sim = order.refundStatus === "completed" && refundIsSimulated(order);
              return (
                <Fragment key={order.id}>
                  <tr
                    onClick={() => setOpen(expanded ? null : order.id)}
                    className={`cursor-pointer border-b border-[var(--merchant-border)] transition-colors hover:bg-[var(--merchant-sunken)] ${
                      order.isDemoBuyer ? "bg-[var(--payzap-accent-soft)]/60" : ""
                    } ${order.refundStatus === "completed" ? "row-flash" : ""}`}
                  >
                    <td className="p-4 font-mono text-xs">
                      <button type="button" aria-expanded={expanded} className="flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setOpen(expanded ? null : order.id); }}>
                        <span className={`inline-block transition-transform ${expanded ? "rotate-90" : ""}`}>›</span>
                        {order.orderNumber}
                      </button>
                    </td>
                    <td className="p-4">
                      {order.buyerName}
                      {order.isDemoBuyer && (
                        <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] text-[var(--payzap-accent)]">This session</span>
                      )}
                    </td>
                    <td className="p-4 tabular-nums">
                      {formatUsd(order.purchasePriceCents)}
                      {order.priceAdjustmentCents > 0 && (
                        <span className="block text-xs text-[var(--merchant-muted)]">effective {formatUsd(order.effectivePriceCents)}</span>
                      )}
                    </td>
                    <td className="p-4 tabular-nums">
                      {order.priceAdjustmentCents ? <span className="text-[var(--ok)]">−{formatUsd(order.priceAdjustmentCents)}</span> : "—"}
                    </td>
                    <td className="p-4">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {order.refundStatus === "queued" ? (
                          <span className="status-pill bg-[var(--merchant-sunken)] text-[var(--merchant-muted)]">Paid</span>
                        ) : (
                          <RefundPill
                            status={order.refundStatus}
                            label={order.refundStatus === "processing" && state.session.isPreview ? "Simulating" : undefined}
                          />
                        )}
                        {sim && <span className="sim-tag text-[var(--warn)]">Simulated</span>}
                      </span>
                      {order.paypalRefundId && (
                        <span className="mt-1 block font-mono text-[10px] text-[var(--merchant-muted)]">{order.paypalRefundId.slice(0, 18)}…</span>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-[var(--merchant-border)] bg-[var(--merchant-sunken)]">
                      <td colSpan={5} className="px-10 py-4">
                        <OrderTimeline
                          order={order}
                          calls={calls}
                          newPriceCents={state.product.priceCents}
                          preview={state.session.isPreview}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="mt-5 text-sm text-[var(--payzap-accent)]"
        onClick={async () => {
          await setRole("buyer");
          router.push("/buyer/orders");
        }}
      >
        Open this customer&apos;s order →
      </button>
    </div>
  );
}

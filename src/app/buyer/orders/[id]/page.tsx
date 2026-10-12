"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductVisual } from "@/components/product-visual";
import { useDemo } from "@/components/demo-provider";
import { useNow } from "@/components/live/use-now";
import { PRODUCT_TAGLINE, STORE_NAME } from "@/lib/constants";
import { refundIsSimulated } from "@/lib/live";
import { formatUsd, formatUsdExact } from "@/lib/money";

const DAY = 86_400_000;

function shortDate(t: string | number) {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BuyerOrderDetailPage() {
  const params = useParams();
  const { state, activity } = useDemo();
  const now = useNow(30_000);
  const orderId = params.id as string;

  if (!state) {
    return (
      <main className="p-8">
        <Link href="/">Generate demo</Link>
      </main>
    );
  }

  const order = state.orders.find((o) => o.id === orderId) ?? state.orders[0];
  const status = state.session.campaignStatus;
  const campaignDone = status === "completed" || status === "partial_failure";
  const refundPending =
    (status === "refunding" || status === "approved") && order.refundStatus !== "completed";
  const refunded = order.refundStatus === "completed" && order.priceAdjustmentCents > 0;
  const showPayoff = campaignDone && refunded;
  const sim = refunded && refundIsSimulated(order);
  const purchased = new Date(order.purchasedAt).getTime();
  const expires = new Date(order.protectionExpiresAt).getTime();
  const daysLeft = Math.max(0, Math.ceil((expires - now) / DAY));
  const windowPct = Math.min(100, Math.max(0, ((now - purchased) / Math.max(1, expires - purchased)) * 100));
  const refundCall = (activity?.calls ?? []).find(
    (c) => c.kind === "refund" && c.ok && c.captureId && c.captureId === order.paypalCaptureId,
  );

  type Step = { label: string; detail?: string; at?: string; state: "done" | "now" | "todo" };
  const timeline: Step[] = [
    { label: `Paid ${formatUsd(order.purchasePriceCents)} with PayPal`, at: shortDate(order.purchasedAt), state: "done" },
    { label: "Delivered", state: "done" },
    {
      label: `Price protection active · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
      detail: `Until ${shortDate(order.protectionExpiresAt)}`,
      state: "done",
    },
    {
      label:
        state.product.priceCents < order.purchasePriceCents
          ? `${STORE_NAME} lowered the price to ${formatUsd(state.product.priceCents)}`
          : "Watching the shop price",
      state: state.product.priceCents < order.purchasePriceCents ? "done" : "now",
    },
    {
      label: refunded
        ? `${formatUsdExact(order.priceAdjustmentCents)} ${sim ? "simulated refund (preview)" : "refunded through PayPal"}`
        : refundPending
          ? state.session.isPreview
            ? "Simulated refund in progress (preview)…"
            : "Refund on its way through PayPal…"
          : "Difference returned automatically if the price drops",
      detail: refunded ? order.paypalRefundId ?? undefined : undefined,
      at: refunded && refundCall ? shortDate(refundCall.createdAt) : undefined,
      state: refunded ? "done" : refundPending ? "now" : "todo",
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <Link href="/buyer/orders" className="text-xs text-[var(--muted)] underline">
        ← {STORE_NAME} orders
      </Link>

      {showPayoff && state.session.buyerNotified && (
        <div className="animate-drop-in mt-6 overflow-hidden rounded-2xl border border-emerald-700/20 bg-emerald-50 p-6 sm:p-8">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-emerald-800">
            PayPal
            {sim && <span className="sim-tag text-amber-800">Simulated · preview</span>}
          </p>
          <p className="font-display mt-2 text-3xl text-emerald-950 sm:text-4xl">
            You got {formatUsd(order.priceAdjustmentCents)} back
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-950/80">
            The price of your {order.productName} changed from {formatUsd(order.purchasePriceCents)} to{" "}
            {formatUsd(order.effectivePriceCents)}. Your price protection was automatically applied.
          </p>
          <p className="mt-3 text-sm font-medium text-emerald-950">
            {formatUsdExact(order.priceAdjustmentCents)}{" "}
            {sim ? "simulated refund. Not sent to PayPal in preview mode." : "refunded through PayPal."}
          </p>
        </div>
      )}

      {refundPending && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-[var(--ink-faint)] bg-white/70 p-4 text-sm text-[var(--ink-soft)]">
          <span className="h-2 w-2 animate-soft-pulse rounded-full bg-[var(--accent-amber)]" />
          Price protection is being applied to eligible orders…
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <ProductVisual className="aspect-[4/3] w-full rounded-2xl" />
          <section className="card-buyer p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Order timeline</p>
            <ol className="mt-4 space-y-0">
              {timeline.map((s, i) => (
                <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < timeline.length - 1 && (
                    <span className={`absolute left-[7px] top-4 h-full w-px ${s.state === "done" ? "bg-[var(--accent-live)]/40" : "bg-[var(--ink-faint)]"}`} />
                  )}
                  <span
                    className={`relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${
                      s.state === "done"
                        ? "border-[var(--accent-live)] bg-[var(--accent-live)]"
                        : s.state === "now"
                          ? "animate-soft-pulse border-[var(--accent-amber)] bg-white"
                          : "border-[var(--ink-faint)] bg-white"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${s.state === "todo" ? "text-[var(--muted)]" : ""}`}>{s.label}</p>
                    {s.detail && <p className="truncate font-mono text-[11px] text-[var(--muted)]">{s.detail}</p>}
                  </div>
                  {s.at && <span className="text-[11px] text-[var(--muted)]">{s.at}</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {order.orderNumber} · Delivered
          </p>
          <h1 className="font-display mt-2 text-4xl">{order.productName}</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{PRODUCT_TAGLINE}</p>

          <dl className="card-buyer mt-6 divide-y divide-[var(--ink-faint)] p-6 text-sm">
            <div className="flex justify-between py-3">
              <dt className="text-[var(--muted)]">Original price</dt>
              <dd className="tabular-nums">{formatUsd(order.purchasePriceCents)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[var(--muted)]">Price adjustment</dt>
              <dd className={`tabular-nums ${order.priceAdjustmentCents ? "text-emerald-800" : ""}`}>
                {order.priceAdjustmentCents ? `−${formatUsd(order.priceAdjustmentCents)}` : "—"}
              </dd>
            </div>
            <div className="flex items-end justify-between py-4">
              <dt className="text-[var(--muted)]">Final effective price</dt>
              <dd className="text-3xl tabular-nums">{formatUsd(order.effectivePriceCents)}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-950">Price protection</p>
              <p className="text-xs text-amber-900">
                {refunded ? "Applied" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
              </p>
            </div>
            <p className="mt-2 text-sm text-amber-950">Protected for 7 days</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-200/70">
              <div className="h-full rounded-full bg-amber-600" style={{ width: `${windowPct}%` }} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              If {STORE_NAME} lowers the public price during your protection window, the eligible
              difference can be automatically returned through PayPal.
            </p>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Payment history</p>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex items-center justify-between gap-4 border-b border-[var(--ink-faint)] pb-3">
                <span>✓ Paid through PayPal</span>
                <span className="tabular-nums">{formatUsd(order.purchasePriceCents)}</span>
              </li>
              {refunded && (
                <li className="animate-fade-up flex items-center justify-between gap-4">
                  <span>
                    ✓ {sim ? "Simulated refund (preview)" : "Refunded through PayPal"}
                    {order.paypalRefundId && (
                      <span className="block font-mono text-[11px] text-[var(--muted)]">{order.paypalRefundId}</span>
                    )}
                  </span>
                  <span className="tabular-nums text-emerald-800">{formatUsdExact(order.priceAdjustmentCents)}</span>
                </li>
              )}
            </ul>
          </div>

          {showPayoff && (
            <p className="font-display mt-8 text-center text-lg">No forms. No support ticket. No claim.</p>
          )}
        </div>
      </div>
    </main>
  );
}

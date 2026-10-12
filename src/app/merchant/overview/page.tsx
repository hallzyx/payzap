"use client";

import Link from "next/link";
import { useDemo } from "@/components/demo-provider";
import { BuyerPreview } from "@/components/live/buyer-preview";
import { LiveFeed } from "@/components/live/live-feed";
import { Money, RefundPill } from "@/components/live/primitives";
import { StoreTraffic } from "@/components/live/store-traffic";
import { PRODUCT_NAME, STORE_NAME } from "@/lib/constants";
import { stageOf } from "@/lib/live";
import { formatUsd } from "@/lib/money";

export default function MerchantOverviewPage() {
  const { state, loading } = useDemo();
  if (loading || !state) return null;

  const { metrics, session, analysis } = state;
  const recent = state.orders.slice(0, 5);
  const stage = stageOf(state);

  const payzapStatus =
    stage === "buyer"
      ? `${metrics.completedRefunds} guarantees honored · ${formatUsd(metrics.totalRefundedCents)} returned`
      : stage === "refund"
        ? "Refunds running now"
        : stage === "approve"
          ? "Waiting for your launch approval"
          : stage === "review" && analysis
            ? analysis.exceedsBudget
              ? `Risk: ${formatUsd(analysis.totalExposureCents)} exposure, over budget`
              : `${formatUsd(analysis.totalExposureCents)} exposure, within budget`
            : `${metrics.protectedPurchases} recent purchases covered. Describe a promotion and PayZap shows the refund exposure before any money moves.`;

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-[var(--payzap-accent)]">PayPal Business</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Summary</h1>
          <p className="mt-1 text-sm text-[var(--merchant-muted)]">
            {STORE_NAME} · payments, orders, and PayPal products
          </p>
        </div>
        <StoreTraffic compact />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card-merchant p-5">
          <p className="text-xs text-[var(--merchant-muted)]">Protected sales</p>
          <p className="metric-hero mt-1 text-[var(--paypal-navy)]">
            <Money cents={metrics.protectedRevenueCents} />
          </p>
          <p className="mt-1 text-[11px] text-[var(--merchant-muted)]">Last 7 days · PayPal Sandbox</p>
        </div>
        <div className="card-merchant p-5">
          <p className="text-xs text-[var(--merchant-muted)]">Protected orders</p>
          <p className="metric-hero mt-1">{metrics.protectedPurchases}</p>
          <p className="mt-1 text-[11px] text-[var(--merchant-muted)]">{PRODUCT_NAME}</p>
        </div>
        <div className="card-merchant p-5">
          <p className="text-xs text-[var(--merchant-muted)]">{session.isPreview ? "Refunded (simulated)" : "Refunded"}</p>
          <p className={`metric-hero mt-1 ${metrics.totalRefundedCents ? "text-[var(--ok)]" : ""}`}>
            <Money cents={metrics.totalRefundedCents} />
          </p>
          <p className="mt-1 text-[11px] text-[var(--merchant-muted)]">
            {metrics.completedRefunds} automatic price adjustments
          </p>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section className="card-merchant overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paypal-navy)] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--payzap-accent)] text-sm font-bold">PZ</span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">PayPal product</p>
                  <h2 className="text-lg font-semibold">PayZap · price protection</h2>
                </div>
              </div>
              <Link href="/merchant/payzap" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[var(--paypal-navy)] hover:bg-white/90">
                Open PayZap →
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
              <p className="max-w-xl leading-relaxed text-[var(--merchant-muted)]">{payzapStatus}</p>
              <p className="text-xs text-[var(--merchant-muted)]">
                Policy: <strong className="text-[var(--merchant-text)]">
                  {state.policy.rules.length} rule{state.policy.rules.length === 1 ? "" : "s"}
                </strong>
              </p>
            </div>
          </section>

          <section className="card-merchant p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent orders</h2>
              <Link href="/merchant/orders" className="text-sm text-[var(--payzap-accent)]">
                View all
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-[var(--merchant-border)] text-sm">
              {recent.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="font-mono text-xs">{order.orderNumber}</span>
                    <span className="mt-0.5 block truncate text-[var(--merchant-muted)]">
                      {order.buyerName}
                      {order.isDemoBuyer && <span className="ml-1.5 text-[10px] text-[var(--payzap-accent)]">This session</span>}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-right tabular-nums">
                    {formatUsd(order.effectivePriceCents)}
                    {order.refundStatus === "queued" ? (
                      <span className="status-pill bg-[var(--merchant-sunken)] text-[var(--merchant-muted)]">Paid</span>
                    ) : (
                      <RefundPill status={order.refundStatus} label={order.refundStatus === "processing" && session.isPreview ? "Simulating" : undefined} />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="space-y-5">
          <LiveFeed max={6} />
          <BuyerPreview />
        </aside>
      </div>
    </div>
  );
}

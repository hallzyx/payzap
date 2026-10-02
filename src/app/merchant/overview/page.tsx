"use client";

import Link from "next/link";
import { useDemo } from "@/components/demo-provider";
import { PRODUCT_NAME, STORE_NAME } from "@/lib/constants";
import { formatUsd } from "@/lib/money";

export default function MerchantOverviewPage() {
  const { state, loading } = useDemo();
  if (loading || !state) return null;

  const recent = state.orders.slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--payzap-accent)]">
        PayPal Business
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Summary</h1>
      <p className="mt-1 text-sm text-[var(--merchant-muted)]">
        {STORE_NAME} · payments, orders, and PayPal products
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card-merchant p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--merchant-muted)]">
            Protected sales
          </p>
          <p className="metric-hero mt-2 text-[var(--paypal-navy)]">
            {formatUsd(state.metrics.protectedRevenueCents)}
          </p>
        </div>
        <div className="card-merchant p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--merchant-muted)]">
            Protected orders
          </p>
          <p className="metric-hero mt-2">{state.metrics.protectedPurchases}</p>
        </div>
        <div className="card-merchant p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--merchant-muted)]">
            Refunded
          </p>
          <p className="metric-hero mt-2">
            {formatUsd(state.metrics.totalRefundedCents)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="card-merchant p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Recent orders</h2>
            <Link href="/merchant/orders" className="text-sm text-[var(--payzap-accent)]">
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-[var(--merchant-border)] text-sm">
            {recent.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="font-mono text-xs">{order.orderNumber}</span>
                  <span className="mt-0.5 block text-[var(--merchant-muted)]">
                    {order.buyerName}
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  {formatUsd(order.effectivePriceCents)}
                  <span className="mt-0.5 block text-xs text-[var(--merchant-muted)]">
                    {order.refundStatus === "completed" ? "Refunded" : "Paid"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-merchant overflow-hidden">
          <div className="bg-[var(--paypal-navy)] px-5 py-4 text-white">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">
              PayPal product
            </p>
            <h2 className="mt-1 text-xl font-semibold">PayZap</h2>
            <p className="mt-1 text-sm text-white/80">
              Price protection on {PRODUCT_NAME}
            </p>
          </div>
          <div className="p-5 text-sm">
            <p className="leading-relaxed text-[var(--merchant-muted)]">
              {state.metrics.protectedPurchases} recent purchases are covered. Describe
              a promotion and PayZap shows the refund exposure before any money moves.
            </p>
            <Link
              href="/merchant/payzap"
              className="mt-5 inline-flex rounded-full bg-[var(--payzap-accent)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Open PayZap
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

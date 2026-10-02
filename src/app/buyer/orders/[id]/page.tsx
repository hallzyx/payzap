"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductVisual } from "@/components/product-visual";
import { useDemo } from "@/components/demo-provider";
import { PRODUCT_TAGLINE, STORE_NAME } from "@/lib/constants";
import { formatUsd, formatUsdExact } from "@/lib/money";

export default function BuyerOrderDetailPage() {
  const params = useParams();
  const { state } = useDemo();
  const orderId = params.id as string;

  if (!state) {
    return (
      <main className="p-8">
        <Link href="/">Generate demo</Link>
      </main>
    );
  }

  const order = state.orders.find((o) => o.id === orderId) ?? state.orders[0];
  const campaignDone =
    state.session.campaignStatus === "completed" ||
    state.session.campaignStatus === "partial_failure";
  const refundPending =
    state.session.campaignStatus === "refunding" ||
    state.session.campaignStatus === "approved";
  const showPayoff = campaignDone && order.priceAdjustmentCents > 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <Link href="/buyer/orders" className="text-xs text-[var(--muted)] underline">
        ← {STORE_NAME} orders
      </Link>

      {showPayoff && state.session.buyerNotified && (
        <div className="animate-fade-up mt-6 rounded-2xl border border-emerald-700/20 bg-emerald-50 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-800">PayPal</p>
          <p
            className="mt-2 text-3xl text-emerald-950 sm:text-4xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            You got {formatUsd(order.priceAdjustmentCents)} back
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-950/80">
            The price of your {order.productName} changed from{" "}
            {formatUsd(order.purchasePriceCents)} to {formatUsd(order.effectivePriceCents)}.
            Your price protection was automatically applied.
          </p>
          <p className="mt-3 text-sm font-medium text-emerald-950">
            {formatUsdExact(order.priceAdjustmentCents)} refunded through PayPal.
          </p>
        </div>
      )}

      {refundPending && (
        <div className="mt-6 rounded-xl border border-[var(--ink-faint)] bg-white/70 p-4 text-sm text-[var(--ink-soft)]">
          Price protection is being applied to eligible orders…
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ProductVisual className="aspect-[4/3] w-full rounded-2xl" />
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {order.orderNumber} · Delivered
          </p>
          <h1 className="mt-2 text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            {order.productName}
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{PRODUCT_TAGLINE}</p>

          <dl className="card-buyer mt-6 divide-y divide-[var(--ink-faint)] p-6 text-sm">
            <div className="flex justify-between py-3">
              <dt className="text-[var(--muted)]">Original price</dt>
              <dd className="tabular-nums">{formatUsd(order.purchasePriceCents)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[var(--muted)]">Price adjustment</dt>
              <dd className="tabular-nums">
                {order.priceAdjustmentCents
                  ? `−${formatUsd(order.priceAdjustmentCents)}`
                  : "—"}
              </dd>
            </div>
            <div className="flex items-end justify-between py-4">
              <dt className="text-[var(--muted)]">Final effective price</dt>
              <dd className="text-3xl tabular-nums">{formatUsd(order.effectivePriceCents)}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-950">
              Price protection
            </p>
            <p className="mt-2 text-sm text-amber-950">Protected for 7 days</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              If {STORE_NAME} lowers the public price during your protection window, the
              eligible difference can be automatically returned through PayPal.
            </p>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Payment history
            </p>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex items-center justify-between gap-4 border-b border-[var(--ink-faint)] pb-3">
                <span>Paid through PayPal</span>
                <span className="tabular-nums">{formatUsd(order.purchasePriceCents)}</span>
              </li>
              {order.refundStatus === "completed" && (
                <li className="flex items-center justify-between gap-4">
                  <span>Refunded through PayPal</span>
                  <span className="tabular-nums">
                    {formatUsdExact(order.priceAdjustmentCents)}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {showPayoff && (
            <p
              className="mt-8 text-center text-lg"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              No forms. No support ticket. No claim.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

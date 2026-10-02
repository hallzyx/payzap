"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DemoBar } from "@/components/demo-bar";
import { useDemo } from "@/components/demo-provider";
import { formatUsd, formatUsdExact } from "@/lib/money";
import { STORE_NAME } from "@/lib/constants";

export default function BuyerOrderDetailPage() {
  const params = useParams();
  const { state, loading } = useDemo();
  const orderId = params.id as string;

  if (!state) {
    return (
      <main className="buyer-shell p-8">
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
    <div className="buyer-shell min-h-screen">
      <DemoBar />
      <main className="mx-auto max-w-2xl px-4 py-10">
        {showPayoff && state.session.buyerNotified && (
          <div className="animate-fade-up mb-8 rounded-xl border border-emerald-600/30 bg-emerald-50/90 p-6">
            <p
              className="text-2xl text-emerald-900"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              You got {formatUsd(order.priceAdjustmentCents)} back
            </p>
            <p className="mt-2 text-sm text-emerald-900/80">
              The price of your {order.productName} changed from{" "}
              {formatUsd(order.purchasePriceCents)} to{" "}
              {formatUsd(order.effectivePriceCents)}.
            </p>
            <p className="mt-2 text-sm">
              Your price protection was automatically applied.
            </p>
            <p className="mt-1 text-sm font-medium">
              {formatUsdExact(order.priceAdjustmentCents)} refunded through PayPal.
            </p>
          </div>
        )}

        {refundPending && (
          <div className="mb-8 rounded-xl border border-[var(--ink-faint)] bg-white/50 p-4 text-sm text-[var(--ink-soft)]">
            Price protection is being applied to eligible orders…
          </div>
        )}

        <Link href="/buyer/orders" className="text-xs text-[var(--muted)] underline">
          ← {STORE_NAME} orders
        </Link>
        <h1
          className="mt-4 text-3xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Order {order.orderNumber}
        </h1>

        <div className="card-buyer mt-8 space-y-6 p-6">
          <div>
            <p className="text-sm text-[var(--muted)]">Product</p>
            <p className="text-lg font-medium">{order.productName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[var(--muted)]">Original price</p>
              <p className="tabular-nums">{formatUsd(order.purchasePriceCents)}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Price adjustment</p>
              <p className="tabular-nums">
                {order.priceAdjustmentCents
                  ? `−${formatUsd(order.priceAdjustmentCents)}`
                  : "—"}
              </p>
            </div>
            <div className="col-span-2 border-t border-[var(--ink-faint)] pt-4">
              <p className="text-[var(--muted)]">Final effective price</p>
              <p className="metric-hero text-2xl">
                {formatUsd(order.effectivePriceCents)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">
              Price protection
            </p>
            <p className="mt-2 text-sm text-amber-950/80">
              Protected for 7 days
            </p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              If {STORE_NAME} lowers the public price during your protection window,
              the eligible difference can be automatically returned through PayPal.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-[var(--muted)]">Payment history</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>✓ {formatUsd(order.purchasePriceCents)} paid through PayPal</li>
              {order.refundStatus === "completed" && (
                <li>✓ {formatUsdExact(order.priceAdjustmentCents)} refunded through PayPal</li>
              )}
            </ul>
          </div>

          {showPayoff && (
            <p
              className="border-t border-[var(--ink-faint)] pt-4 text-center text-sm font-medium"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              No forms. No support ticket. No claim.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

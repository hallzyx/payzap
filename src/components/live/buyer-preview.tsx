"use client";

import { useRouter } from "next/navigation";
import { useDemo } from "@/components/demo-provider";
import { ProductVisual } from "@/components/product-visual";
import { demoOrderOf, refundIsSimulated } from "@/lib/live";
import { formatUsd } from "@/lib/money";

/**
 * A live, read-only window onto the buyer's Aster account, so the judge sees
 * both sides at once. Every value comes from this session's order.
 */
export function BuyerPreview() {
  const { state, setRole } = useDemo();
  const router = useRouter();
  if (!state) return null;
  const order = demoOrderOf(state);
  if (!order) return null;

  const status = state.session.campaignStatus;
  const refunded = order.refundStatus === "completed" && order.priceAdjustmentCents > 0;
  const pending =
    (status === "approved" || status === "refunding") && order.refundStatus !== "completed";
  const sim = refunded && refundIsSimulated(order);

  async function open() {
    await setRole("buyer");
    router.push(`/buyer/orders/${order!.id}`);
  }

  return (
    <section className="card-merchant overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--merchant-border)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Buyer&apos;s view</h2>
          <p className="text-[11px] text-[var(--merchant-muted)]">
            {order.buyerName} · {order.orderNumber} · live
          </p>
        </div>
        <button type="button" onClick={open} className="text-xs font-medium text-[var(--payzap-accent)] hover:underline">
          Open →
        </button>
      </header>
      <div className="bg-[var(--merchant-sunken)] p-4">
        <div className="mx-auto max-w-[260px] overflow-hidden rounded-[1.4rem] border-[5px] border-[#1b1f24] bg-[var(--paper)] text-[var(--ink)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--ink-faint)] bg-[var(--surface-elevated)] px-3 py-2">
            <span className="store-mark text-[10px]">ASTER</span>
            <span className="text-[9px] text-[var(--muted)]">Your orders</span>
          </div>
          <div className="relative min-h-[196px] p-3">
            {refunded && state.session.buyerNotified && (
              <div
                key={order.paypalRefundId ?? "refund"}
                className="animate-drop-in absolute inset-x-2 top-2 z-10 rounded-xl border border-[var(--ok)]/25 bg-white/95 p-2.5 shadow-lg backdrop-blur"
              >
                <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--ok)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" /> PayPal · now
                  {sim && <span className="sim-tag text-[var(--warn)]">Simulated</span>}
                </p>
                <p className="mt-1 text-[13px] font-semibold leading-tight">
                  You got {formatUsd(order.priceAdjustmentCents)} back
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-[var(--ink-soft)]">
                  Price dropped to {formatUsd(order.effectivePriceCents)}. No claim needed.
                </p>
              </div>
            )}
            <div className={`flex gap-2.5 transition-opacity duration-500 ${refunded ? "mt-[92px]" : ""}`}>
              <ProductVisual className="h-14 w-16 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">{order.productName}</p>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">Paid with PayPal</p>
                <p className="mt-1 text-[13px] font-semibold tabular-nums">
                  {refunded && (
                    <span className="mr-1 text-[10px] font-normal text-[var(--muted)] line-through">
                      {formatUsd(order.purchasePriceCents)}
                    </span>
                  )}
                  {formatUsd(order.effectivePriceCents)}
                </p>
              </div>
            </div>
            <p
              className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                refunded
                  ? "bg-[var(--ok-soft)] text-[var(--ok)]"
                  : pending
                    ? "bg-white text-[var(--ink-soft)]"
                    : "bg-amber-100 text-amber-950"
              }`}
            >
              {refunded ? "Price protection applied" : pending ? (
                <><span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-[var(--accent-amber)]" /> Applying price protection…</>
              ) : "Price protection active · 7 days"}
            </p>
            {!refunded && (
              <p className="mt-2 text-[10px] leading-snug text-[var(--muted)]">
                Shop price now <strong className="tabular-nums text-[var(--ink)]">{formatUsd(state.product.priceCents)}</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

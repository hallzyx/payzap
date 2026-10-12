"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { demoOrderOf, refundIsSimulated } from "@/lib/live";
import { formatUsd, formatUsdExact } from "@/lib/money";

type Toast = {
  key: string;
  kind: "price" | "refund";
};

function seen(key: string): boolean {
  try {
    return window.sessionStorage.getItem(`pz-toast:${key}`) === "1";
  } catch {
    return false;
  }
}
function markSeen(key: string) {
  try {
    window.sessionStorage.setItem(`pz-toast:${key}`, "1");
  } catch {
    /* Storage can be blocked. The toast just shows again. */
  }
}

/**
 * Phone-style notifications on the buyer skin. They fire from real session
 * changes: the store price dropping and this buyer's refund completing.
 */
export function BuyerToasts() {
  const { state } = useDemo();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastPrice = useRef<number | null>(null);

  const order = state ? demoOrderOf(state) : undefined;
  const price = state?.product.priceCents ?? null;
  const sessionId = state?.session.id;
  const refunded =
    order?.refundStatus === "completed" && (order?.priceAdjustmentCents ?? 0) > 0 && state?.session.buyerNotified;
  const refundKey = refunded ? `${sessionId}:refund:${order?.paypalRefundId ?? ""}` : null;

  useEffect(() => {
    if (price == null || !sessionId) return;
    const prev = lastPrice.current;
    lastPrice.current = price;
    if (prev != null && price < prev) {
      const key = `${sessionId}:price:${price}`;
      if (!seen(key)) {
        markSeen(key);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a polled server change
        setToasts((t) => [...t.filter((x) => x.kind !== "price"), { key, kind: "price" }]);
      }
    }
  }, [price, sessionId]);

  useEffect(() => {
    if (!refundKey || seen(refundKey)) return;
    markSeen(refundKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a polled server change
    setToasts((t) => [...t.filter((x) => x.kind !== "price"), { key: refundKey, kind: "refund" }]);
  }, [refundKey]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const id = window.setTimeout(() => setToasts((t) => t.filter((x) => x.kind === "refund")), 6000);
    return () => window.clearTimeout(id);
  }, [toasts]);

  if (!state || !order || toasts.length === 0) return null;
  const sim = refundIsSimulated(order);

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" aria-live="assertive">
      {toasts.map((t) =>
        t.kind === "price" ? (
          <div key={t.key} className="animate-drop-in pointer-events-auto rounded-2xl border border-[var(--ink-faint)] bg-white/95 p-3.5 text-[var(--ink)] shadow-xl backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Aster · just now</p>
            <p className="mt-1 text-sm font-medium">
              {state.product.name} is now {formatUsd(state.product.priceCents)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
              You paid {formatUsd(order.purchasePriceCents)}. Your price protection is being applied.
            </p>
          </div>
        ) : (
          <div key={t.key} className="animate-drop-in pointer-events-auto rounded-2xl border border-[var(--ok)]/25 bg-white p-4 text-[var(--ink)] shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ok)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" />
                {sim ? "Refund · preview" : "PayPal · refund received"}
                {sim && <span className="sim-tag text-[var(--warn)]">Simulated</span>}
              </p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setToasts((all) => all.filter((x) => x.key !== t.key))}
                className="-mr-1 -mt-1 rounded-full px-1.5 text-sm text-[var(--muted)] hover:bg-black/5"
              >
                ×
              </button>
            </div>
            <p className="font-display mt-1 text-2xl">You got {formatUsd(order.priceAdjustmentCents)} back</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
              {formatUsdExact(order.priceAdjustmentCents)} {sim ? "simulated refund" : "refunded through PayPal"} on{" "}
              {order.orderNumber}. No claim needed.
            </p>
            <Link href={`/buyer/orders/${order.id}`} className="mt-2 inline-block text-xs font-medium text-[var(--accent-live)] underline">
              View order
            </Link>
          </div>
        ),
      )}
    </div>
  );
}

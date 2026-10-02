"use client";

import Link from "next/link";
import { useDemo } from "@/components/demo-provider";
import { formatUsd } from "@/lib/money";
import { STORE_NAME } from "@/lib/constants";

export default function BuyerOrdersPage() {
  const { state, loading, setRole } = useDemo();

  if (loading && !state) {
    return <p className="p-8">Loading…</p>;
  }
  if (!state) {
    return (
      <main className="buyer-shell p-8">
        <Link href="/" className="underline">
          Generate a demo first
        </Link>
      </main>
    );
  }

  const demoOrder = state.orders.find((o) => o.isDemoBuyer) ?? state.orders[0];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)]">{STORE_NAME}</p>
        <h1
          className="mt-2 text-3xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Your orders
        </h1>

        <Link
          href={`/buyer/orders/${demoOrder.id}`}
          className="card-buyer mt-8 block p-6 transition hover:border-[var(--accent-amber)]"
        >
          <div className="flex justify-between gap-4">
            <div>
              <p className="font-medium">{demoOrder.productName}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {demoOrder.orderNumber} · PayPal · {demoOrder.orderStatus}
              </p>
            </div>
            <p className="metric-hero text-xl">{formatUsd(demoOrder.effectivePriceCents)}</p>
          </div>
          <p className="mt-4 inline-block rounded-full bg-amber-100/80 px-3 py-1 text-xs text-amber-900">
            Price protection active
          </p>
        </Link>

        <button
          type="button"
          onClick={() => {
            setRole("merchant");
            window.location.href = "/merchant/overview";
          }}
          className="mt-10 text-sm text-[var(--accent-live)] underline"
        >
          See what happens from the merchant side →
        </button>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductVisual } from "@/components/product-visual";
import { useDemo } from "@/components/demo-provider";
import { PRODUCT_TAGLINE } from "@/lib/constants";
import { formatUsd } from "@/lib/money";

export default function BuyerOrdersPage() {
  const { state, loading, setRole } = useDemo();
  const router = useRouter();

  if (loading && !state) {
    return <p className="p-8">Loading…</p>;
  }
  if (!state) {
    return (
      <main className="p-8">
        <Link href="/" className="underline">
          Generate a demo first
        </Link>
      </main>
    );
  }

  const demoOrder = state.orders.find((o) => o.isDemoBuyer) ?? state.orders[0];
  const refunded = demoOrder.refundStatus === "completed" && demoOrder.priceAdjustmentCents > 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Your account</p>
      <h1 className="mt-2 text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>
        Orders
      </h1>

      <Link
        href={`/buyer/orders/${demoOrder.id}`}
        className="card-buyer mt-8 flex flex-col gap-5 p-4 transition hover:border-[var(--accent-live)] sm:flex-row sm:items-center sm:p-6"
      >
        <ProductVisual className="h-40 w-full shrink-0 rounded-xl sm:h-36 sm:w-44" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-medium">{demoOrder.productName}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{PRODUCT_TAGLINE}</p>
            </div>
            <p className="text-lg tabular-nums">{formatUsd(demoOrder.effectivePriceCents)}</p>
          </div>
          <p className="mt-4 text-sm text-[var(--ink-soft)]">
            {demoOrder.orderNumber} · Delivered · Paid with PayPal
          </p>
          <p className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-950">
            {refunded ? "Price protection applied" : "Price protection active"}
          </p>
        </div>
      </Link>

      <section className="card-buyer mt-6 grid overflow-hidden md:grid-cols-[240px_minmax(0,1fr)]">
        <ProductVisual className="min-h-48" />
        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">In the shop now</p>
          <h2 className="mt-2 text-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            {state.product.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{PRODUCT_TAGLINE}</p>
          <p className="mt-4 text-3xl tabular-nums">{formatUsd(state.product.priceCents)}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {state.product.stock} in stock · ships from Aster
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--ink-soft)]">
            You already own this. If Aster lowers the public price during your 7-day
            protection window, PayPal returns the difference. No form. No ticket.
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={async () => {
          await setRole("merchant");
          router.push("/merchant/overview");
        }}
        className="mt-8 text-sm text-[var(--accent-live)] underline"
      >
        See what happens from the merchant side →
      </button>
    </main>
  );
}

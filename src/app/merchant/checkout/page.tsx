"use client";

import { useDemo } from "@/components/demo-provider";
import { PRODUCT_NAME, STORE_NAME } from "@/lib/constants";
import { formatUsd } from "@/lib/money";

export default function CheckoutPage() {
  const { state } = useDemo();
  if (!state) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--payzap-accent)]">
        PayPal product
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Checkout</h1>
      <p className="mt-1 text-sm text-[var(--merchant-muted)]">
        Online payments for {STORE_NAME}
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="card-merchant p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--merchant-muted)]">Status</p>
          <p className="mt-2 text-lg font-medium">Accepting PayPal payments</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--merchant-muted)]">
            Customers pay on {STORE_NAME} and the money lands in this PayPal Business
            account. Price protection is handled by PayZap, not at the button.
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--merchant-muted)]">Store</dt>
              <dd>{STORE_NAME}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--merchant-muted)]">Featured item</dt>
              <dd>{PRODUCT_NAME}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--merchant-muted)]">Current price</dt>
              <dd className="tabular-nums">{formatUsd(state.product.priceCents)}</dd>
            </div>
          </dl>
        </section>

        <section className="card-merchant p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--merchant-muted)]">
            Button on the product page
          </p>
          <div className="mt-5 rounded-xl border border-[var(--merchant-border)] bg-[#f7f9fb] p-6">
            <p className="text-sm text-[var(--merchant-muted)]">{PRODUCT_NAME}</p>
            <p className="mt-1 text-2xl tabular-nums">{formatUsd(state.product.priceCents)}</p>
            <div className="mt-5 flex h-11 items-center justify-center rounded-full bg-[#ffc439] text-sm font-semibold text-[#001c40]">
              PayPal
            </div>
            <p className="mt-3 text-center text-xs text-[var(--merchant-muted)]">
              Debit or credit card
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

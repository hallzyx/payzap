"use client";

import { ProductVisual } from "@/components/product-visual";
import { useDemo } from "@/components/demo-provider";
import { PRODUCT_TAGLINE } from "@/lib/constants";
import { formatUsd } from "@/lib/money";

export default function MerchantProductsPage() {
  const { state } = useDemo();
  if (!state) return null;

  const { product } = state;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
      <p className="mt-1 text-sm text-[var(--merchant-muted)]">
        Catalog selling through PayPal Checkout
      </p>

      <article className="card-merchant mt-8 grid overflow-hidden md:grid-cols-[280px_minmax(0,1fr)]">
        <ProductVisual className="min-h-56" />
        <div className="p-6">
          <p className="font-mono text-xs text-[var(--merchant-muted)]">{product.sku}</p>
          <h2 className="mt-2 text-2xl font-semibold">{product.name}</h2>
          <p className="mt-1 text-sm text-[var(--merchant-muted)]">{PRODUCT_TAGLINE}</p>
          <p className="mt-5 text-3xl tabular-nums">{formatUsd(product.priceCents)}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[var(--merchant-muted)]">Stock</dt>
              <dd className="mt-1 tabular-nums">{product.stock}</dd>
            </div>
            <div>
              <dt className="text-[var(--merchant-muted)]">Protected orders</dt>
              <dd className="mt-1 tabular-nums">{product.protectedPurchaseCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--merchant-muted)]">Protection</dt>
              <dd className="mt-1">7 days · PayZap</dd>
            </div>
          </dl>
        </div>
      </article>
    </div>
  );
}

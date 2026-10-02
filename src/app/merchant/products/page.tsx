"use client";

import { useDemo } from "@/components/demo-provider";
import { formatUsd } from "@/lib/money";

export default function MerchantProductsPage() {
  const { state } = useDemo();
  if (!state) return null;

  const { product } = state;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Products</h1>
      <div className="card-merchant mt-8 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--merchant-border)] text-[var(--merchant-muted)]">
            <tr>
              <th className="p-4 font-normal">Product</th>
              <th className="p-4 font-normal">Price</th>
              <th className="p-4 font-normal">Stock</th>
              <th className="p-4 font-normal">Protected</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--merchant-border)]">
              <td className="p-4">
                <p className="font-medium">{product.name}</p>
                <p className="text-xs text-[var(--merchant-muted)]">{product.sku}</p>
              </td>
              <td className="p-4 tabular-nums">{formatUsd(product.priceCents)}</td>
              <td className="p-4 tabular-nums">{product.stock}</td>
              <td className="p-4 tabular-nums">{product.protectedPurchaseCount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

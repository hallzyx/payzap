"use client";

import { useRouter } from "next/navigation";
import { useDemo } from "@/components/demo-provider";
import { formatUsd } from "@/lib/money";

export default function MerchantOrdersPage() {
  const { state, setRole } = useDemo();
  const router = useRouter();
  if (!state) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-[var(--merchant-muted)]">
        {state.orders.length} PayPal payments with price protection
      </p>
      <div className="card-merchant mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--merchant-border)] text-xs uppercase tracking-wide text-[var(--merchant-muted)]">
            <tr>
              <th className="p-4 font-medium">Order</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Paid</th>
              <th className="p-4 font-medium">Adjustment</th>
              <th className="p-4 font-medium">PayPal</th>
            </tr>
          </thead>
          <tbody>
            {state.orders.map((order) => (
              <tr
                key={order.id}
                className={`border-b border-[var(--merchant-border)] ${
                  order.isDemoBuyer ? "bg-[#e8f3fb]/70" : ""
                }`}
              >
                <td className="p-4 font-mono text-xs">{order.orderNumber}</td>
                <td className="p-4">
                  {order.buyerName}
                  {order.isDemoBuyer && (
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] text-[var(--payzap-accent)]">
                      This session
                    </span>
                  )}
                </td>
                <td className="p-4 tabular-nums">
                  {formatUsd(order.purchasePriceCents)}
                  {order.priceAdjustmentCents > 0 && (
                    <span className="block text-xs text-[var(--merchant-muted)]">
                      effective {formatUsd(order.effectivePriceCents)}
                    </span>
                  )}
                </td>
                <td className="p-4 tabular-nums">
                  {order.priceAdjustmentCents
                    ? `−${formatUsd(order.priceAdjustmentCents)}`
                    : "—"}
                </td>
                <td className="p-4">
                  {order.refundStatus === "completed" ? (
                    <span className="text-emerald-700">
                      Refunded
                      {order.paypalRefundId && (
                        <span className="block font-mono text-[10px] text-[var(--merchant-muted)]">
                          {order.paypalRefundId.slice(0, 18)}…
                        </span>
                      )}
                    </span>
                  ) : order.refundStatus === "processing" ? (
                    "Processing"
                  ) : order.refundStatus === "failed" ? (
                    <span className="text-red-700">Failed</span>
                  ) : (
                    <span className="text-[var(--merchant-muted)]">Paid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="mt-5 text-sm text-[var(--payzap-accent)]"
        onClick={async () => {
          await setRole("buyer");
          router.push("/buyer/orders");
        }}
      >
        Open this customer&apos;s order →
      </button>
    </div>
  );
}

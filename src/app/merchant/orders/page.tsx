"use client";

import { useRouter } from "next/navigation";
import { useDemo } from "@/components/demo-provider";
import { formatUsd, formatUsdExact } from "@/lib/money";

export default function MerchantOrdersPage() {
  const { state, setRole } = useDemo();
  const router = useRouter();
  if (!state) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="mt-1 text-sm text-[var(--merchant-muted)]">
        {state.orders.length} protected purchases
      </p>
      <div className="card-merchant mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--merchant-border)] text-[var(--merchant-muted)]">
            <tr>
              <th className="p-3 font-normal">Order</th>
              <th className="p-3 font-normal">Buyer</th>
              <th className="p-3 font-normal">Amount</th>
              <th className="p-3 font-normal">Adjustment</th>
              <th className="p-3 font-normal">PayPal refund</th>
            </tr>
          </thead>
          <tbody>
            {state.orders.map((order) => (
              <tr
                key={order.id}
                className={`border-b border-[var(--merchant-border)] ${
                  order.isDemoBuyer ? "bg-[var(--payzap-accent)]/5" : ""
                }`}
              >
                <td className="p-3 font-mono text-xs">{order.orderNumber}</td>
                <td className="p-3">
                  {order.buyerName}
                  {order.isDemoBuyer && (
                    <span className="ml-2 text-[10px] text-[var(--payzap-accent)]">
                      demo buyer
                    </span>
                  )}
                </td>
                <td className="p-3 tabular-nums">
                  {formatUsd(order.purchasePriceCents)}
                  {order.priceAdjustmentCents > 0 && (
                    <span className="block text-xs text-[var(--merchant-muted)]">
                      effective {formatUsd(order.effectivePriceCents)}
                    </span>
                  )}
                </td>
                <td className="p-3 tabular-nums">
                  {order.priceAdjustmentCents
                    ? `−${formatUsd(order.priceAdjustmentCents)}`
                    : "—"}
                </td>
                <td className="p-3">
                  {order.refundStatus === "completed" ? (
                    <span className="text-emerald-400">
                      Completed
                      {order.paypalRefundId && (
                        <span className="block font-mono text-[10px] opacity-70">
                          {order.paypalRefundId.slice(0, 18)}…
                        </span>
                      )}
                    </span>
                  ) : order.refundStatus === "processing" ? (
                    "Processing"
                  ) : order.refundStatus === "failed" ? (
                    <span className="text-red-400">Failed</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-[var(--merchant-muted)]">
        Highlighted row is the session buyer. After refunds: original{" "}
        {formatUsd(100_000)}, adjustment −{formatUsdExact(15_000)}, effective{" "}
        {formatUsd(85_000)}.
      </p>
      <button
        type="button"
        className="mt-4 text-sm text-[var(--payzap-accent)]"
        onClick={async () => {
          await setRole("buyer");
          router.push("/buyer/orders");
        }}
      >
        Switch to buyer view →
      </button>
    </div>
  );
}

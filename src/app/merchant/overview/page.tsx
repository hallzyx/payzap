"use client";

import Link from "next/link";
import { useDemo } from "@/components/demo-provider";
import { formatUsd } from "@/lib/money";
import { STORE_NAME } from "@/lib/constants";

export default function MerchantOverviewPage() {
  const { state } = useDemo();
  if (!state) {
    return <p className="p-4">Generate a demo from the home page.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-[var(--merchant-muted)]">
        {STORE_NAME} operations · PayPal Sandbox
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card-merchant p-5">
          <p className="text-xs uppercase text-[var(--merchant-muted)]">
            Protected GMV
          </p>
          <p className="metric-hero mt-2 text-[var(--payzap-accent)]">
            {formatUsd(state.metrics.protectedRevenueCents)}
          </p>
        </div>
        <div className="card-merchant p-5">
          <p className="text-xs uppercase text-[var(--merchant-muted)]">
            Protected purchases
          </p>
          <p className="metric-hero mt-2">{state.metrics.protectedPurchases}</p>
        </div>
        <div className="card-merchant p-5">
          <p className="text-xs uppercase text-[var(--merchant-muted)]">
            Refund exposure (live)
          </p>
          <p className="metric-hero mt-2">
            {formatUsd(state.metrics.totalRefundedCents)}
          </p>
        </div>
      </div>
      <Link
        href="/merchant/payzap"
        className="mt-8 inline-block rounded-lg bg-[var(--payzap-accent)] px-5 py-2.5 text-sm font-medium text-white"
      >
        Plan a campaign in PayZap →
      </Link>
    </div>
  );
}

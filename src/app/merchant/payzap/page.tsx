"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { DEFAULT_PROMO_PROMPT } from "@/lib/constants";
import { formatUsd } from "@/lib/money";

export default function PayZapPage() {
  const { state, refresh } = useDemo();
  const [prompt, setPrompt] = useState(DEFAULT_PROMO_PROMPT);
  const [analyzing, setAnalyzing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state) return null;

  const { session, metrics, product, analysis, orders } = state;
  const canAnalyze =
    session.campaignStatus === "idle" || session.campaignStatus === "analyzed";
  const showRisk = analysis && session.proposedPriceCents != null;
  const refunding = session.campaignStatus === "refunding";
  const done =
    session.campaignStatus === "completed" ||
    session.campaignStatus === "partial_failure";

  async function analyze() {
    setError(null);
    setAnalyzing(true);
    const res = await fetch("/api/campaign/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    setAnalyzing(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Analysis failed");
      return;
    }
    await refresh();
  }

  async function acceptPrice() {
    setError(null);
    setAccepting(true);
    const res = await fetch("/api/campaign/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    setAccepting(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Could not accept the price");
      return;
    }
    await refresh();
  }

  async function launchCampaign() {
    setError(null);
    setLaunching(true);
    const res = await fetch("/api/campaign/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "launch" }),
    });
    setLaunching(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Launch failed");
      return;
    }
    await refresh();
  }

  async function retry(orderId: string) {
    await fetch("/api/refunds/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    await refresh();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--payzap-accent)] text-lg font-bold text-white">
          PZ
        </div>
        <div>
          <h1 className="text-2xl font-semibold">PayZap</h1>
          <p className="text-sm text-[var(--merchant-muted)]">
            Price protection · Powered by PayPal Sandbox
          </p>
        </div>
      </div>

      {session.isPreview && !session.batchId && (
        <div className="mt-6 rounded-lg border border-amber-600/40 bg-amber-950/30 p-4 text-sm text-amber-200">
          Live PayPal Sandbox capacity is temporarily unavailable. Refunds will
          run in clearly labeled preview simulation until capture batches are seeded.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card-merchant p-4">
          <p className="text-xs text-[var(--merchant-muted)]">Protected revenue</p>
          <p className="metric-hero text-[var(--payzap-accent)]">
            {formatUsd(metrics.protectedRevenueCents)}
          </p>
        </div>
        <div className="card-merchant p-4">
          <p className="text-xs text-[var(--merchant-muted)]">Protected purchases</p>
          <p className="metric-hero">{metrics.protectedPurchases}</p>
        </div>
        <div className="card-merchant p-4">
          <p className="text-xs text-[var(--merchant-muted)]">Current refund exposure</p>
          <p className="metric-hero">
            {showRisk && analysis
              ? formatUsd(analysis.totalExposureCents)
              : formatUsd(0)}
          </p>
        </div>
        <div className="card-merchant p-4">
          <p className="text-xs text-[var(--merchant-muted)]">Product · current price</p>
          <p className="mt-1 font-medium">{product.name}</p>
          <p className="tabular-nums">{formatUsd(product.priceCents)}</p>
        </div>
      </div>

      <div className="card-merchant mt-8 p-6">
        <p className="text-xs uppercase tracking-wider text-[var(--merchant-muted)]">
          Campaign planning
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={!canAnalyze || session.expired}
          rows={3}
          className="mt-4 w-full rounded-lg border border-[var(--merchant-border)] bg-[var(--merchant-bg)] p-3 text-sm text-white"
        />
        <button
          type="button"
          disabled={!canAnalyze || analyzing || session.expired}
          onClick={analyze}
          className="mt-4 rounded-lg bg-white/10 px-5 py-2 text-sm hover:bg-white/15 disabled:opacity-40"
        >
          {analyzing ? "Analyzing impact…" : "Analyze Impact"}
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      {showRisk && analysis && (
        <div className="card-merchant mt-6 animate-fade-up p-6">
          <p className="text-xs uppercase text-red-400">Campaign risk</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-[var(--merchant-muted)]">Proposed price</dt>
              <dd className="tabular-nums text-lg">
                {formatUsd(analysis.proposedPriceCents)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--merchant-muted)]">Protected customers</dt>
              <dd className="tabular-nums text-lg">{analysis.eligibleCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--merchant-muted)]">Expected refunds</dt>
              <dd className="tabular-nums text-lg text-red-300">
                {formatUsd(analysis.totalExposureCents)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--merchant-muted)]">Refund budget</dt>
              <dd className="tabular-nums text-lg">
                {analysis.refundBudgetCents != null
                  ? formatUsd(analysis.refundBudgetCents)
                  : "—"}
              </dd>
            </div>
          </dl>
          {analysis.exceedsBudget && (
            <p className="mt-4 text-sm font-medium text-red-300">
              Exceeds budget by {formatUsd(analysis.overByCents)}
            </p>
          )}
          {analysis.recommendedPriceCents != null && (
            <div className="mt-6 border-t border-[var(--merchant-border)] pt-6">
              <p className="text-xs uppercase text-emerald-400">Recommendation</p>
              <p className="mt-2 text-2xl tabular-nums">
                {formatUsd(analysis.recommendedPriceCents)}
              </p>
              <p className="mt-2 text-sm text-[var(--merchant-muted)]">
                Expected total refunds{" "}
                {formatUsd(analysis.recommendedExposureCents ?? 0)} across{" "}
                {analysis.eligibleCount} customers.
              </p>
              <p className="mt-2 text-xs text-[var(--merchant-muted)]">
                {analysis.reason}
              </p>
              {session.campaignStatus === "analyzed" && (
                <button
                  type="button"
                  disabled={accepting || session.expired}
                  onClick={acceptPrice}
                  className="mt-6 rounded-lg bg-white px-6 py-3 text-sm font-medium text-[var(--merchant-bg)] hover:bg-white/90 disabled:opacity-40"
                >
                  {accepting
                    ? "Saving…"
                    : `Use ${formatUsd(analysis.recommendedPriceCents)}`}
                </button>
              )}
              {session.campaignStatus === "accepted" && (
                <div className="mt-6">
                  <p className="text-sm text-emerald-200">
                    {formatUsd(analysis.recommendedPriceCents ?? 0)} is selected.
                    Launching changes the store price and executes partial refunds
                    through PayPal Sandbox.
                  </p>
                  <button
                    type="button"
                    disabled={launching || session.expired}
                    onClick={launchCampaign}
                    className="mt-4 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                  >
                    {launching ? "Launching…" : "Launch campaign"}
                  </button>
                </div>
              )}
              <p className="mt-2 text-[10px] text-[var(--merchant-muted)]">
                The recommendation stays advisory until you accept it. Launch is a
                separate approval and moves money.
              </p>
            </div>
          )}
        </div>
      )}

      {(refunding || done) && (
        <div className="card-merchant mt-6 p-6">
          <p className="text-xs uppercase text-[var(--merchant-muted)]">
            Refund execution · PayPal Sandbox
          </p>
          <ul className="mt-4 space-y-2 font-mono text-xs">
            {orders.map((order, i) => {
              let label = "Queued";
              if (order.refundStatus === "completed") {
                label = `✓ ${formatUsd(order.priceAdjustmentCents)} refunded`;
              } else if (order.refundStatus === "processing") {
                label = "Processing";
              } else if (order.refundStatus === "failed") {
                label = "Failed";
              } else if (order.refundStatus === "skipped") {
                label = "Skipped";
              }
              return (
                <li
                  key={order.id}
                  className="flex items-center justify-between border-b border-[var(--merchant-border)] py-2"
                >
                  <span>
                    {i + 1} / {orders.length} · {order.orderNumber}
                  </span>
                  <span className="flex items-center gap-2">
                    {label}
                    {order.refundStatus === "failed" && (
                      <button
                        type="button"
                        onClick={() => retry(order.id)}
                        className="text-[var(--payzap-accent)]"
                      >
                        Retry
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {done && (
            <p className="mt-4 text-sm">
              {metrics.completedRefunds} / {orders.length} completed · Total
              refunded {formatUsd(metrics.totalRefundedCents)}
            </p>
          )}
          {orders[0]?.eligibility && (
            <div className="mt-6 rounded border border-[var(--merchant-border)] p-4 text-xs">
              <p className="font-medium">Sample eligibility · {orders[0].orderNumber}</p>
              <ul className="mt-2 space-y-1">
                {orders[0].eligibility.checks.map((c) => (
                  <li key={c.label}>
                    {c.passed ? "✓" : "✗"} {c.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

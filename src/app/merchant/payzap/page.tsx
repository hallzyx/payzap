"use client";

import { useEffect, useRef } from "react";
import { useDemo } from "@/components/demo-provider";
import { BuyerPreview } from "@/components/live/buyer-preview";
import { LiveFeed } from "@/components/live/live-feed";
import { Money } from "@/components/live/primitives";
import { usePlanPreview } from "@/components/live/use-plan-preview";
import { CampaignPlanner } from "@/components/payzap/campaign-planner";
import { PolicyBrain } from "@/components/payzap/policy-brain";
import { RefundRun } from "@/components/payzap/refund-run";
import { RiskDecision } from "@/components/payzap/risk-decision";
import { stageOf, type Stage } from "@/lib/live";

const STAGES: Array<{ id: Stage; label: string }> = [
  { id: "plan", label: "Policy & plan" },
  { id: "review", label: "Risk" },
  { id: "approve", label: "Approve" },
  { id: "refund", label: "Refunds" },
  { id: "buyer", label: "Buyer paid back" },
];

function StageRail({ stage }: { stage: Stage }) {
  const idx = STAGES.findIndex((s) => s.id === (stage === "policy" ? "plan" : stage));
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-[11px]" aria-label="Campaign progress">
      {STAGES.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={s.id} className="flex items-center gap-1.5">
            <span
              aria-current={current ? "step" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors ${
                current
                  ? "bg-[var(--paypal-navy)] text-white"
                  : done
                    ? "bg-[var(--ok-soft)] text-[var(--ok)]"
                    : "bg-white text-[var(--merchant-muted)] ring-1 ring-[var(--merchant-border)]"
              }`}
            >
              {done ? "✓" : i + 1} {s.label}
            </span>
            {i < STAGES.length - 1 && <span className="h-px w-3 bg-[var(--merchant-border-strong)]" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function PayZapPage() {
  const { state } = useDemo();
  const { preview, loading: previewLoading } = usePlanPreview();
  const riskRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const status = state?.session.campaignStatus;
  const lastStatus = useRef(status);

  // Bring the next decision into view when the state machine moves forward.
  useEffect(() => {
    if (status === lastStatus.current) return;
    const prev = lastStatus.current;
    lastStatus.current = status;
    if (!prev) return;
    const target =
      status === "analyzed" ? riskRef.current : status === "approved" || status === "refunding" ? runRef.current : null;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [status]);

  if (!state) return null;

  const { session, metrics, product, analysis } = state;
  const stage = stageOf(state);
  const live = ["approved", "refunding", "completed", "partial_failure"].includes(session.campaignStatus);
  const exposureCents = live ? metrics.totalRefundedCents : analysis?.totalExposureCents ?? 0;
  const exposureLabel = live
    ? session.isPreview
      ? "Refunded (simulated)"
      : "Refunded via PayPal"
    : analysis
      ? "Exposure at asked price"
      : "Current refund exposure";

  return (
    <div className="mx-auto max-w-[1240px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--payzap-accent)] text-base font-bold text-white shadow-sm">
            PZ
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">PayZap</h1>
            <p className="text-sm text-[var(--merchant-muted)]">
              A PayPal product in this demo · price protection for {product.name}
            </p>
          </div>
        </div>
        <StageRail stage={stage} />
      </header>

      {session.isPreview && (
        <div className="mt-4 flex gap-2 rounded-lg border border-[var(--warn-border)] bg-[var(--warn-soft)] px-4 py-2.5 text-xs text-[var(--warn)]">
          <span aria-hidden="true">◐</span>
          {session.batchId
            ? "Preview mode: PayPal Sandbox credentials are not configured, so refunds run as a clearly labeled simulation."
            : "Live PayPal Sandbox capacity is temporarily unavailable. Refunds will run in clearly labeled preview simulation."}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-merchant p-4">
          <p className="text-xs text-[var(--merchant-muted)]">Protected revenue</p>
          <p className="metric-hero mt-1 text-[var(--paypal-navy)]"><Money cents={metrics.protectedRevenueCents} /></p>
          <p className="mt-1 text-[11px] text-[var(--merchant-muted)]">{metrics.protectedPurchases} PayPal orders under guarantee</p>
        </div>
        <div className="card-merchant p-4">
          <p className="text-xs text-[var(--merchant-muted)]">{exposureLabel}</p>
          <p className={`metric-hero mt-1 ${live ? "text-[var(--ok)]" : analysis?.exceedsBudget ? "text-[var(--risk)]" : ""}`}>
            <Money cents={exposureCents} />
          </p>
          <p className="mt-1 text-[11px] text-[var(--merchant-muted)]">
            {live
              ? `${metrics.completedRefunds} refunds completed`
              : analysis?.refundBudgetCents != null
                ? `Budget ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(analysis.refundBudgetCents / 100)}`
                : "No price change yet"}
          </p>
        </div>
        <div className="card-merchant p-4">
          <p className="text-xs text-[var(--merchant-muted)]">Store price · {product.name}</p>
          <p className="metric-hero mt-1"><Money cents={product.priceCents} /></p>
          <p className="mt-1 text-[11px] text-[var(--merchant-muted)]">{product.stock} in stock · {live ? "campaign live" : "no campaign"}</p>
        </div>
        <div className="card-merchant p-4">
          <p className="text-xs text-[var(--merchant-muted)]">Policy</p>
          <p className="mt-1 text-lg font-semibold">
            {state.policy.rules.length} rule{state.policy.rules.length === 1 ? "" : "s"}
            {state.policy.ambiguities.length > 0 && (
              <span className="ml-2 rounded-full bg-[var(--warn-soft)] px-2 py-0.5 text-[11px] text-[var(--warn)]">
                {state.policy.ambiguities.length} question{state.policy.ambiguities.length === 1 ? "" : "s"}
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-[var(--merchant-muted)]">
            {preview ? `${preview.coverage.filter((c) => c.covered).length} of ${preview.coverage.length} orders covered` : "…"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <PolicyBrain preview={preview} previewLoading={previewLoading} />
          <CampaignPlanner />
          <div ref={riskRef} className="scroll-mt-20">
            <RiskDecision preview={preview} />
          </div>
          <div ref={runRef} className="scroll-mt-20">
            <RefundRun />
          </div>
        </div>
        <aside className="space-y-5 xl:sticky xl:top-16">
          <BuyerPreview />
          <LiveFeed max={7} />
        </aside>
      </div>
    </div>
  );
}

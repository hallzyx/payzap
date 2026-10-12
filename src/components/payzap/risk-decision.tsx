"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { ExposureCurve } from "@/components/live/exposure-curve";
import { Money, Spinner } from "@/components/live/primitives";
import type { PlanPreview } from "@/components/live/use-plan-preview";
import { formatUsd } from "@/lib/money";

export function RiskDecision({ preview }: { preview: PlanPreview | null }) {
  const { state, refresh } = useDemo();
  const [busy, setBusy] = useState<"accept" | "launch" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!state?.analysis || state.session.proposedPriceCents == null) return null;
  const { analysis, session, orders } = state;
  const status = session.campaignStatus;
  const budget = analysis.refundBudgetCents;
  const rec = analysis.recommendedPriceCents;
  const usedPct = budget ? Math.min(160, (analysis.totalExposureCents / budget) * 100) : 0;
  const recPct = budget && analysis.recommendedExposureCents != null
    ? Math.min(160, (analysis.recommendedExposureCents / budget) * 100)
    : 0;
  const recPerOrder = rec != null ? Math.max(0, orders[0]?.purchasePriceCents - rec) : 0;

  async function act(action: "accept" | "launch") {
    setError(null);
    setBusy(action);
    const res = await fetch("/api/campaign/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? (action === "accept" ? "Could not accept the price" : "Launch failed"));
    } else {
      await refresh();
    }
    setBusy(null);
  }

  const launched = !["idle", "analyzed", "accepted"].includes(status);

  // After launch the live numbers belong to the refund run; this card becomes the
  // approved decision record. (Re-running the analysis on refunded orders would
  // only say they already had an adjustment.)
  if (launched) {
    return (
      <section className="card-merchant flex flex-wrap items-center justify-between gap-4 px-5 py-4" aria-label="Approved campaign">
        <div>
          <p className="eyebrow text-[var(--ok)]">✓ Approved by the merchant</p>
          <p className="mt-1 text-sm">
            Asked {formatUsd(analysis.proposedPriceCents)} · PayZap recommended{" "}
            <strong>{rec != null ? formatUsd(rec) : "—"}</strong> · store price is now{" "}
            <strong className="tabular-nums">{formatUsd(state.product.priceCents)}</strong>
          </p>
        </div>
        {budget != null && (
          <p className="text-xs text-[var(--merchant-muted)]">
            Budget {formatUsd(budget)}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="card-merchant animate-fade-up overflow-hidden" aria-labelledby="risk-title">
      <div className="grid lg:grid-cols-2">
        {/* Asked */}
        <div className={`p-5 ${analysis.exceedsBudget ? "bg-[var(--risk-soft)]/50" : ""}`}>
          <p className={`eyebrow ${analysis.exceedsBudget ? "text-[var(--risk)]" : "text-[var(--ok)]"}`}>
            {analysis.exceedsBudget ? "Campaign risk" : "Within budget"}
          </p>
          <h2 id="risk-title" className="mt-1 text-sm text-[var(--merchant-muted)]">
            You asked for <strong className="text-[var(--merchant-text)]">{formatUsd(analysis.proposedPriceCents)}</strong>
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-[var(--merchant-muted)]">Protected customers</dt>
              <dd className="text-lg font-semibold tabular-nums">{analysis.eligibleCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--merchant-muted)]">Refund each</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatUsd(analysis.refundPerOrderCents)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--merchant-muted)]">Expected refunds</dt>
              <dd className={`metric-hero ${analysis.exceedsBudget ? "text-[var(--risk)]" : ""}`}>
                <Money cents={analysis.totalExposureCents} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--merchant-muted)]">Refund budget</dt>
              <dd className="metric-hero text-[var(--merchant-muted)]">{budget != null ? formatUsd(budget) : "—"}</dd>
            </div>
          </dl>
          {budget != null && (
            <div className="mt-4">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-[var(--merchant-border)]">
                <div
                  className={`progress-fill h-full rounded-full ${analysis.exceedsBudget ? "bg-[var(--risk)]" : "bg-[var(--ok)]"}`}
                  style={{ width: `${(Math.min(usedPct, 160) / 160) * 100}%` }}
                />
                <span className="absolute inset-y-0 w-0.5 bg-[var(--merchant-text)]" style={{ left: `${(100 / 160) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-xs tabular-nums">
                {analysis.exceedsBudget ? (
                  <strong className="text-[var(--risk)]">Exceeds budget by {formatUsd(analysis.overByCents)}</strong>
                ) : (
                  <span className="text-[var(--ok)]">{Math.round(usedPct)}% of budget</span>
                )}
              </p>
            </div>
          )}
          {analysis.excludedOrders.length > 0 && (
            <div className="mt-4 rounded-md border border-[var(--warn-border)] bg-white/70 p-3 text-xs">
              <p className="font-semibold">Not covered by your policy ({analysis.excludedOrders.length})</p>
              <ul className="mt-1 space-y-0.5 text-[var(--merchant-muted)]">
                {analysis.excludedOrders.map((o) => (
                  <li key={o.orderNumber}>
                    <span className="font-mono">{o.orderNumber}</span> · {o.reasons.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recommended */}
        <div className="border-t border-[var(--merchant-border)] p-5 lg:border-l lg:border-t-0">
          {rec != null ? (
            <>
              <p className="eyebrow text-[var(--ok)]">PayZap recommends</p>
              <p className="mt-1 text-sm text-[var(--merchant-muted)]">Lowest price that respects your budget</p>
              <p className="mt-3 text-5xl font-semibold tracking-tight tabular-nums text-[var(--merchant-text)]">
                {formatUsd(rec)}
              </p>
              <p className="mt-2 text-sm tabular-nums">
                {analysis.eligibleCount} × {formatUsd(recPerOrder)} ={" "}
                <strong className="text-[var(--ok)]">{formatUsd(analysis.recommendedExposureCents ?? 0)}</strong>
                {budget != null && <span className="text-[var(--merchant-muted)]"> of {formatUsd(budget)}</span>}
              </p>
              {budget != null && (
                <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--merchant-border)]">
                  <div className="progress-fill h-full rounded-full bg-[var(--ok)]" style={{ width: `${(recPct / 160) * 100}%` }} />
                  <span className="absolute inset-y-0 w-0.5 bg-[var(--merchant-text)]" style={{ left: `${(100 / 160) * 100}%` }} />
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed text-[var(--merchant-muted)]">{analysis.reason}</p>

              <div className="mt-5">
                {status === "analyzed" && (
                  <button type="button" className="btn-primary px-6 py-3" disabled={busy != null || session.expired} onClick={() => act("accept")}>
                    {busy === "accept" ? <><Spinner /> Saving…</> : `Use ${formatUsd(rec)}`}
                  </button>
                )}
                {status === "accepted" && (
                  <div className="animate-fade-up rounded-lg border border-[var(--ok)]/30 bg-[var(--ok-soft)] p-4">
                    <p className="text-sm font-semibold">{formatUsd(rec)} is selected. Launching moves money.</p>
                    <ul className="mt-2 space-y-1 text-xs tabular-nums text-[var(--merchant-muted)]">
                      <li>Store price {formatUsd(state.product.priceCents)} → <strong className="text-[var(--merchant-text)]">{formatUsd(rec)}</strong></li>
                      <li>{analysis.eligibleCount} partial refunds of {formatUsd(recPerOrder)} · total <strong className="text-[var(--merchant-text)]">{formatUsd(analysis.recommendedExposureCents ?? 0)}</strong></li>
                      <li>{session.isPreview ? "Preview mode: refunds are simulated and not sent to PayPal" : "Executed through PayPal Sandbox. Refunds are not reversible."}</li>
                    </ul>
                    <button type="button" className="btn-go mt-3 px-6 py-3" disabled={busy != null || session.expired} onClick={() => act("launch")}>
                      {busy === "launch" ? <><Spinner /> Launching…</> : "Launch campaign"}
                    </button>
                  </div>
                )}
                {launched && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-[var(--ok-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--ok)]">
                    ✓ Approved · live at {formatUsd(state.product.priceCents)}
                  </p>
                )}
              </div>
              <p className="mt-3 text-[10px] text-[var(--merchant-muted)]">
                The recommendation stays advisory until you accept it. Launch is a separate approval and moves money.
              </p>
            </>
          ) : (
            <div className="text-sm text-[var(--merchant-muted)]">
              <p className="eyebrow">No recommendation</p>
              <p className="mt-2">{analysis.reason}</p>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-[var(--risk)]" role="alert">{error}</p>}
        </div>
      </div>

      {preview && preview.curve.length > 1 && !launched && (
        <div className="border-t border-[var(--merchant-border)] p-5">
          <ExposureCurve preview={preview} />
        </div>
      )}
    </section>
  );
}

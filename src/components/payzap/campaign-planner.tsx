"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { Spinner } from "@/components/live/primitives";
import { CAMPAIGN_PROMPT_MAX_CHARS, DEFAULT_PROMO_PROMPT } from "@/lib/constants";

const STEPS = [
  "Reading price and budget from your sentence",
  "Applying your policy to each protected order",
  "Computing refunds per order",
  "Searching for the lowest budget-safe price",
];

export function CampaignPlanner({ onAnalyzed }: { onAnalyzed?: () => void }) {
  const { state, refresh } = useDemo();
  const [prompt, setPrompt] = useState(state?.session.analyzedPrompt ?? DEFAULT_PROMO_PROMPT);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!state) return null;
  const { session, policy } = state;
  const canAnalyze = session.campaignStatus === "idle" || session.campaignStatus === "analyzed";
  const openQuestions = policy.ambiguities.length;
  const disabled = !canAnalyze || session.expired;

  async function analyze() {
    setError(null);
    setAnalyzing(true);
    setStep(0);
    const ticker = window.setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 420);
    try {
      const res = await fetch("/api/campaign/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Analysis failed");
        return;
      }
      await refresh();
      onAnalyzed?.();
    } finally {
      window.clearInterval(ticker);
      setAnalyzing(false);
    }
  }

  return (
    <section className="card-merchant p-5" aria-labelledby="plan-title">
      <p className="eyebrow text-[var(--payzap-accent)]">Step 2 · Plan a promotion</p>
      <h2 id="plan-title" className="mt-1 text-lg font-semibold">
        What do you want to run?
      </h2>
      <div className="relative mt-3">
        <textarea
          aria-label="Campaign request"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={disabled || analyzing}
          maxLength={CAMPAIGN_PROMPT_MAX_CHARS}
          rows={2}
          className="field resize-none pr-16 text-[15px]"
        />
        <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] tabular-nums text-[var(--merchant-muted)]">
          {prompt.length}/{CAMPAIGN_PROMPT_MAX_CHARS}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-[var(--merchant-muted)]">
        One short sentence: the sale price and the refund budget. A model reads only those two numbers;
        every refund amount is computed by code.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={disabled || analyzing || openQuestions > 0 || prompt.trim().length === 0}
          onClick={analyze}
        >
          {analyzing ? <><Spinner /> Analyzing impact…</> : "Analyze Impact"}
        </button>
        {openQuestions > 0 && (
          <p className="text-xs text-[var(--warn)]">Answer the open policy question above first.</p>
        )}
        {!canAnalyze && !session.expired && (
          <p className="text-xs text-[var(--merchant-muted)]">Campaign is past planning. Reset the scenario to plan again.</p>
        )}
      </div>
      {analyzing && (
        <ol className="mt-4 space-y-1.5 text-xs" aria-live="polite">
          {STEPS.map((label, i) => (
            <li key={label} className={`flex items-center gap-2 ${i > step ? "opacity-35" : ""}`}>
              <span className="flex h-4 w-4 items-center justify-center">
                {i < step ? <span className="text-[var(--ok)]">✓</span> : i === step ? <Spinner className="h-3 w-3 text-[var(--payzap-accent)]" /> : "○"}
              </span>
              {label}
            </li>
          ))}
        </ol>
      )}
      {error && <p className="mt-3 text-sm text-[var(--risk)]" role="alert">{error}</p>}
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { ProductVisual } from "@/components/product-visual";
import { STORE_NAME } from "@/lib/constants";
import { demoOrderOf } from "@/lib/live";
import { formatUsd } from "@/lib/money";

const SETUP_STEPS = [
  "Creating storefront",
  "Creating buyer",
  "Creating merchant",
  "Loading protected purchases",
  "Connecting PayPal Sandbox transactions",
  "Activating price protection",
];

/** Static sketch of both sides. Shown before a session exists and labeled as such. */
function TwoSidedSketch({ building, step }: { building: boolean; step: number }) {
  const lit = (i: number) => !building || step >= i;
  return (
    <div className="relative" aria-hidden="true">
      <span className="sim-tag absolute -top-6 right-0 text-[var(--muted)]">Illustration</span>
      <div className="grid gap-3 sm:grid-cols-[0.85fr_1.15fr]">
        <div className={`card-buyer overflow-hidden transition-opacity duration-500 ${lit(0) ? "opacity-100" : "opacity-30"}`}>
          <div className="flex items-center justify-between border-b border-[var(--ink-faint)] bg-[var(--surface-elevated)] px-3 py-2">
            <span className="store-mark text-[10px]">ASTER</span>
            <span className="text-[10px] text-[var(--muted)]">Buyer</span>
          </div>
          <div className="p-3">
            <ProductVisual className="h-24 w-full rounded-lg" />
            <p className="mt-2 text-xs font-medium">Aster Nova Pro</p>
            <p className="text-[11px] text-[var(--muted)]">Paid with PayPal</p>
            <p className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] transition-colors duration-500 ${lit(5) ? "bg-amber-100 text-amber-950" : "bg-white text-[var(--muted)]"}`}>
              {lit(5) ? "Price protection active" : "…"}
            </p>
          </div>
        </div>
        <div className={`overflow-hidden rounded-xl border border-[#d6dde5] bg-white text-[var(--merchant-text)] shadow-xl transition-opacity duration-500 ${lit(2) ? "opacity-100" : "opacity-30"}`}>
          <div className="flex items-center justify-between bg-[var(--paypal-navy)] px-3 py-2 text-white">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Business console</span>
            <span className="text-[10px] text-white/70">Merchant</span>
          </div>
          <div className="space-y-2 p-3">
            <div className="flex gap-2">
              <div className="flex-1 rounded-md border border-[var(--merchant-border)] p-2">
                <p className="text-[9px] text-[var(--merchant-muted)]">Protected</p>
                <p className="text-sm font-semibold tabular-nums">{lit(3) ? "10 orders" : "—"}</p>
              </div>
              <div className="flex-1 rounded-md border border-[var(--merchant-border)] p-2">
                <p className="text-[9px] text-[var(--merchant-muted)]">PayPal</p>
                <p className="text-sm font-semibold">{lit(4) ? "Sandbox" : "—"}</p>
              </div>
            </div>
            <div className="rounded-md border border-[var(--ai-border)] bg-[var(--ai-soft)] p-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--ai)]">PayZap · policy</p>
              <p className="mt-1 text-[11px]">Protected for 7 days after purchase</p>
              <p className="text-[10px] italic text-[var(--ai)]">“…lasts 7 days after purchase…”</p>
            </div>
            <div className="space-y-1">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`flex items-center justify-between rounded px-1.5 py-1 text-[10px] transition-opacity duration-300 ${lit(3) ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className="font-mono">AST-100{i}</span>
                  <span className="rounded-full bg-[var(--merchant-sunken)] px-1.5 text-[var(--merchant-muted)]">Paid</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { state, loading, notice, generateDemo, setRole } = useDemo();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [entering, setEntering] = useState<"buyer" | "merchant" | null>(null);

  async function handleGenerate() {
    setCreating(true);
    try {
      const pending = generateDemo();
      const paypalStep = SETUP_STEPS.indexOf("Connecting PayPal Sandbox transactions");
      for (let i = 0; i < SETUP_STEPS.length; i++) {
        setStepIndex(i);
        if (i === paypalStep) {
          await pending;
        } else {
          await new Promise((r) => setTimeout(r, 380));
        }
      }
      await pending;
    } finally {
      setCreating(false);
    }
  }

  async function enter(role: "buyer" | "merchant") {
    setEntering(role);
    await setRole(role);
    router.push(role === "buyer" ? "/buyer/orders" : "/merchant/overview");
  }

  const ready = Boolean(state && !loading && !creating);
  const order = state ? demoOrderOf(state) : undefined;

  return (
    <main className="buyer-shell relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-[var(--accent-amber)] blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#9cc3e6] blur-3xl" />
      </div>
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="animate-fade-up text-xs uppercase tracking-[0.25em] text-[var(--accent-live)]">
            PayPal AI Hackathon · PayZap
          </p>
          <h1 className="font-display animate-fade-up stagger-1 mt-4 max-w-xl text-4xl leading-tight sm:text-5xl">
            Know what a price drop will cost—before you launch it.
          </h1>
          <p className="animate-fade-up stagger-2 mt-5 max-w-lg text-[var(--ink-soft)]">
            PayZap reads your price-protection policy, shows the refund exposure of a promotion, recommends a
            budget-safe price, and on your approval pays buyers back through PayPal. No claim, no ticket.
          </p>
          <p className="animate-fade-up stagger-2 mt-3 text-xs text-[var(--muted)]">
            One click builds an isolated {STORE_NAME} store and merchant console on PayPal Sandbox · temporary 30-minute session · no signup
          </p>

          {!ready && !creating && (
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="animate-fade-up stagger-3 mt-8 w-fit rounded-full bg-[var(--accent-live)] px-8 py-3.5 text-sm font-medium text-white shadow-lg shadow-[var(--accent-live)]/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Checking for a session…" : "Generate Live Demo"}
            </button>
          )}

          {creating && (
            <div className="animate-fade-up mt-8 max-w-md card-buyer p-5" aria-live="polite">
              <p className="text-sm font-medium">Building your demo…</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--ink-faint)]/50">
                <div className="progress-fill h-full bg-[var(--accent-live)]" style={{ width: `${((stepIndex + 1) / SETUP_STEPS.length) * 100}%` }} />
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-[var(--ink-soft)]">
                {SETUP_STEPS.map((step, i) => (
                  <li key={step} className={`flex items-center gap-2 transition-opacity ${i <= stepIndex ? "text-[var(--ink)]" : "opacity-40"}`}>
                    <span className="w-4 text-center">
                      {i < stepIndex ? "✓" : i === stepIndex ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent align-middle" /> : "○"}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ready && state && (
            <div className="animate-fade-up mt-8 max-w-lg">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Your 30-minute demo is ready</p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-soft)]">
                <li>✓ {state.orders.length} protected orders</li>
                <li>✓ {formatUsd(state.metrics.protectedRevenueCents)} under guarantee</li>
                <li>
                  ✓ {state.session.isPreview ? "Preview mode (simulated refunds)" : "PayPal Sandbox captures linked"}
                </li>
              </ul>
              {state.session.isPreview && (
                <p className="mt-3 text-xs text-amber-800">
                  {notice ?? "Preview mode. Refunds stay simulated until Sandbox credentials can open real captures."}
                </p>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => enter("buyer")}
                  disabled={entering != null}
                  className="group rounded-xl border border-[var(--ink)] bg-[var(--ink)] p-4 text-left text-[var(--paper)] transition hover:brightness-125"
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-70">Start here · Buyer</span>
                  <span className="mt-1 block text-base font-medium">{entering === "buyer" ? "Opening Aster…" : "Enter as Buyer →"}</span>
                  <span className="mt-1 block font-mono text-[11px] opacity-60">{state.session.buyerId}</span>
                  {order && <span className="mt-1 block text-[11px] opacity-80">{order.orderNumber} · {formatUsd(order.purchasePriceCents)} paid</span>}
                </button>
                <button
                  type="button"
                  onClick={() => enter("merchant")}
                  disabled={entering != null}
                  className="rounded-xl border border-[var(--ink)] p-4 text-left transition hover:bg-white/50"
                >
                  <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Merchant</span>
                  <span className="mt-1 block text-base font-medium">{entering === "merchant" ? "Opening console…" : "Enter as Merchant →"}</span>
                  <span className="mt-1 block font-mono text-[11px] text-[var(--muted)]">{state.session.merchantId}</span>
                  <span className="mt-1 block text-[11px] text-[var(--ink-soft)]">Business console with PayZap</span>
                </button>
              </div>
              <button type="button" className="mt-4 text-xs text-[var(--muted)] underline" onClick={handleGenerate}>
                Generate a fresh session
              </button>
            </div>
          )}
        </div>

        <div className="animate-fade-up stagger-3 hidden lg:block">
          <TwoSidedSketch building={creating} step={stepIndex} />
          <p className="mt-4 text-center text-xs text-[var(--muted)]">
            Buyer and merchant share one live session. A merchant decision becomes a PayPal refund the buyer sees.
          </p>
        </div>
      </div>
    </main>
  );
}

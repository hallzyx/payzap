"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { STORE_NAME } from "@/lib/constants";

const SETUP_STEPS = [
  "Creating storefront",
  "Creating buyer",
  "Creating merchant",
  "Loading protected purchases",
  "Connecting PayPal Sandbox transactions",
  "Activating price protection",
];

export default function HomePage() {
  const { state, loading, notice, generateDemo, setRole } = useDemo();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  async function handleGenerate() {
    setCreating(true);
    try {
      const pending = generateDemo();
      const paypalStep = SETUP_STEPS.indexOf(
        "Connecting PayPal Sandbox transactions",
      );
      for (let i = 0; i < SETUP_STEPS.length; i++) {
        setStepIndex(i);
        if (i === paypalStep) {
          await pending;
        } else {
          await new Promise((r) => setTimeout(r, 450));
        }
      }
      await pending;
    } finally {
      setCreating(false);
    }
  }

  if (state && !loading && !creating) {
    return (
      <main className="buyer-shell flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="card-buyer max-w-lg animate-fade-up p-10 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Your 30-minute demo is ready
          </p>
          <h1
            className="mt-4 font-[family-name:var(--font-fraunces)] text-3xl text-[var(--ink)]"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Enter as Buyer or Merchant
          </h1>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">
            PayPal Sandbox · temporary session · no signup required
          </p>
          {state.session.isPreview && (
            <p className="mt-4 text-sm text-amber-800">
              {notice ??
                "Preview mode. Refunds stay simulated until Sandbox credentials can open real captures."}
            </p>
          )}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--ink-faint)] p-4 text-left">
              <p className="text-xs uppercase text-[var(--muted)]">Buyer</p>
              <p className="mt-1 font-mono text-sm">{state.session.buyerId}</p>
              <button
                type="button"
                className="mt-4 w-full rounded-lg bg-[var(--ink)] py-2.5 text-sm text-[var(--paper)]"
                onClick={async () => {
                  await setRole("buyer");
                  router.push("/buyer/orders");
                }}
              >
                Enter as Buyer
              </button>
              <p className="mt-2 text-[10px] text-[var(--muted)]">Recommended first</p>
            </div>
            <div className="rounded-xl border border-[var(--ink-faint)] p-4 text-left">
              <p className="text-xs uppercase text-[var(--muted)]">Merchant</p>
              <p className="mt-1 font-mono text-sm">{state.session.merchantId}</p>
              <button
                type="button"
                className="mt-4 w-full rounded-lg border border-[var(--ink)] py-2.5 text-sm"
                onClick={async () => {
                  await setRole("merchant");
                  router.push("/merchant/overview");
                }}
              >
                Enter as Merchant
              </button>
            </div>
          </div>
          <Link
            href="/"
            className="mt-6 inline-block text-xs text-[var(--muted)] underline"
            onClick={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
          >
            Generate a fresh session
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="buyer-shell relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-[var(--accent-amber)] blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20">
        <p className="animate-fade-up text-xs uppercase tracking-[0.25em] text-[var(--accent-live)]">
          PayPal AI Hackathon
        </p>
        <h1
          className="animate-fade-up stagger-1 mt-4 max-w-xl text-4xl leading-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Know what a price drop will cost—before you launch it.
        </h1>
        <p className="animate-fade-up stagger-2 mt-6 max-w-lg text-[var(--ink-soft)]">
          Generate an isolated {STORE_NAME} storefront with protected purchases and real PayPal
          Sandbox refunds—no API keys, no seed scripts, no manual setup.
        </p>
        <p className="animate-fade-up stagger-2 mt-2 text-xs text-[var(--muted)]">
          Integrated with PayPal Sandbox · temporary 30-minute session
        </p>

        {creating ? (
          <div className="animate-fade-up mt-10 card-buyer p-6">
            <p className="text-sm font-medium">Preparing your demo…</p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--ink-soft)]">
              {SETUP_STEPS.map((step, i) => (
                <li
                  key={step}
                  className={i <= stepIndex ? "text-[var(--ink)]" : "opacity-40"}
                >
                  {i < stepIndex ? "✓" : i === stepIndex ? "…" : "○"} {step}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handleGenerate}
            className="animate-fade-up stagger-3 mt-10 w-fit rounded-full bg-[var(--accent-live)] px-8 py-3.5 text-sm font-medium text-white shadow-lg shadow-[var(--accent-live)]/25 transition hover:brightness-110"
          >
            Generate Live Demo
          </button>
        )}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useDemo } from "@/components/demo-provider";
import { STORE_NAME } from "@/lib/constants";

function formatRemaining(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DemoBar() {
  const { state, notice, setRole, resetScenario, freshLiveRun, clearNotice } =
    useDemo();
  if (!state) return null;

  const { session } = state;
  const role = session.role;
  const expired = session.expired;
  const showFreshRun =
    session.batchConsumed ||
    session.hasLivePaypalRefunds ||
    session.campaignStatus === "completed" ||
    session.campaignStatus === "partial_failure";

  return (
    <div className="demo-bar sticky top-0 z-50 border-b border-[var(--ink-faint)] bg-[var(--surface-elevated)]/95 text-[var(--ink)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs tracking-wide">
        <div className="flex items-center gap-3">
          <span className="font-mono uppercase text-[var(--accent-live)]">
            Live Demo
          </span>
          <span className="text-[var(--muted)]">·</span>
          <span>
            PayPal Sandbox{" "}
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
          </span>
          <span className="text-[var(--muted)]">·</span>
          <span className="tabular-nums">
            {expired ? "Expired" : formatRemaining(session.remainingMs)} remaining
          </span>
          {session.isPreview && (
            <>
              <span className="text-[var(--muted)]">·</span>
              <span className="text-amber-700">Preview mode (simulated refunds)</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={expired}
            onClick={() => setRole("buyer")}
            className={`demo-pill ${role === "buyer" ? "demo-pill-active" : ""} disabled:opacity-40`}
          >
            Buyer
          </button>
          <button
            type="button"
            disabled={expired}
            onClick={() => setRole("merchant")}
            className={`demo-pill ${role === "merchant" ? "demo-pill-active" : ""} disabled:opacity-40`}
          >
            Merchant
          </button>
          <button
            type="button"
            disabled={expired}
            onClick={() => resetScenario()}
            className="demo-pill disabled:opacity-40"
          >
            Reset Scenario
          </button>
          {showFreshRun && (
            <button
              type="button"
              disabled={expired}
              onClick={() => freshLiveRun()}
              className="demo-pill disabled:opacity-40"
            >
              Fresh live run
            </button>
          )}
          {role === "buyer" ? (
            <Link href="/buyer/orders" className="demo-pill">
              {STORE_NAME} Orders
            </Link>
          ) : (
            <Link href="/merchant/payzap" className="demo-pill demo-pill-accent">
              Open PayZap
            </Link>
          )}
        </div>
      </div>
      {notice && (
        <div className="border-t border-[var(--ink-faint)] bg-amber-50 px-4 py-2 text-xs text-amber-950">
          <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
            <p>{notice}</p>
            <button type="button" onClick={clearNotice} className="underline">
              Dismiss
            </button>
          </div>
        </div>
      )}
      {session.hasLivePaypalRefunds && (
        <div className="border-t border-[var(--ink-faint)] px-4 py-2 text-xs text-[var(--ink-soft)]">
          <p className="mx-auto max-w-6xl">
            PayPal Sandbox refunds already executed on this session stay on those
            captures. Reset does not reverse them.
          </p>
        </div>
      )}
    </div>
  );
}

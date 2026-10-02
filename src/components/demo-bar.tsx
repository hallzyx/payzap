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
  const { state, setRole, resetScenario } = useDemo();
  if (!state) return null;

  const { session } = state;
  const role = session.role;

  return (
    <div className="demo-bar sticky top-0 z-50 border-b border-[var(--ink-faint)] bg-[var(--surface-elevated)]/95 backdrop-blur-md">
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
            {session.expired ? "Expired" : formatRemaining(session.remainingMs)}{" "}
            remaining
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
            onClick={() => setRole("buyer")}
            className={`demo-pill ${role === "buyer" ? "demo-pill-active" : ""}`}
          >
            Buyer
          </button>
          <button
            type="button"
            onClick={() => setRole("merchant")}
            className={`demo-pill ${role === "merchant" ? "demo-pill-active" : ""}`}
          >
            Merchant
          </button>
          <button type="button" onClick={() => resetScenario()} className="demo-pill">
            Reset Scenario
          </button>
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
    </div>
  );
}

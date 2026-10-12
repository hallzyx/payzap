"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDemo } from "@/components/demo-provider";
import { useNow } from "@/components/live/use-now";
import { STORE_NAME } from "@/lib/constants";
import { demoOrderOf, stageOf } from "@/lib/live";
import { formatUsd } from "@/lib/money";
import type { DemoState } from "@/lib/types";

function formatRemaining(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** One-line guide for a judge: what to do next, from the real state. */
function nextStep(state: DemoState, pathname: string): { text: string; href?: string; role?: "buyer" | "merchant" } | null {
  const stage = stageOf(state);
  const onBuyer = pathname.startsWith("/buyer");
  const onPayZap = pathname.startsWith("/merchant/payzap");
  const order = demoOrderOf(state);
  switch (stage) {
    case "policy":
      return onPayZap ? { text: "Answer PayZap's policy question" } : { text: "Open PayZap", href: "/merchant/payzap", role: "merchant" };
    case "plan":
      if (onBuyer) return { text: "See what happens from the merchant side", href: "/merchant/payzap", role: "merchant" };
      return onPayZap ? { text: "Compile a policy, then Analyze Impact" } : { text: "Open PayZap", href: "/merchant/payzap", role: "merchant" };
    case "review":
      return onPayZap ? { text: `Review the risk, then use ${state.analysis?.recommendedPriceCents != null ? formatUsd(state.analysis.recommendedPriceCents) : "the safe price"}` } : { text: "Back to PayZap", href: "/merchant/payzap", role: "merchant" };
    case "approve":
      return onPayZap ? { text: "Launch the campaign" } : { text: "Back to PayZap", href: "/merchant/payzap", role: "merchant" };
    case "refund":
      return { text: "Refunds are running…" };
    case "buyer":
      if (onBuyer) return null;
      return order && order.refundStatus === "completed"
        ? { text: `See ${formatUsd(order.priceAdjustmentCents)} land for the buyer`, href: `/buyer/orders/${order.id}`, role: "buyer" }
        : { text: "Open the buyer's order", href: "/buyer/orders", role: "buyer" };
  }
}

export function DemoBar() {
  const { state, notice, setRole, resetScenario, freshLiveRun, clearNotice } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const now = useNow(1000);
  if (!state) return null;

  async function openBuyer() {
    await setRole("buyer");
    if (!pathname.startsWith("/buyer")) router.push("/buyer/orders");
  }

  async function openMerchant() {
    await setRole("merchant");
    if (!pathname.startsWith("/merchant")) router.push("/merchant/overview");
  }

  const { session } = state;
  // The skin on screen is the role the visitor is in, even after a direct link.
  const role = pathname.startsWith("/merchant") ? "merchant" : pathname.startsWith("/buyer") ? "buyer" : session.role;
  const remaining = new Date(session.expiresAt).getTime() - now;
  const expired = session.expired || remaining <= 0;
  const showFreshRun =
    session.batchConsumed ||
    session.hasLivePaypalRefunds ||
    session.campaignStatus === "completed" ||
    session.campaignStatus === "partial_failure";
  const step = nextStep(state, pathname);

  async function goStep() {
    if (!step?.href) return;
    if (step.role && step.role !== role) await setRole(step.role);
    router.push(step.href);
  }

  return (
    <div className="demo-bar sticky top-0 z-50 border-b border-[var(--ink-faint)] bg-[var(--surface-elevated)]/95 text-[var(--ink)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-xs tracking-wide">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5 font-mono uppercase text-[var(--accent-live)]">
            <span className="relative flex h-2 w-2">
              {!expired && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-live)] opacity-60" />}
              <span className="relative h-2 w-2 rounded-full bg-[var(--accent-live)]" />
            </span>
            Live Demo
          </span>
          <span className="text-[var(--muted)]">·</span>
          <span>
            {session.isPreview ? "PayPal Sandbox · preview mode" : "PayPal Sandbox"}{" "}
            <span className={`inline-block h-1.5 w-1.5 rounded-full align-middle ${session.isPreview ? "bg-amber-500" : "bg-emerald-500"}`} />
          </span>
          <span className="text-[var(--muted)]">·</span>
          <span className="tabular-nums">{expired ? "Expired" : `${formatRemaining(remaining)} remaining`}</span>
          {session.isPreview && (
            <>
              <span className="text-[var(--muted)]">·</span>
              <span className="text-amber-800">Simulated refunds</span>
            </>
          )}
        </div>

        {step && !expired && (() => {
          const cls =
            "order-last flex w-full items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium normal-case tracking-normal sm:order-none sm:w-auto";
          const inner = (
            <>
              <span className="text-[10px] uppercase tracking-wider opacity-70">Next</span>
              {step.text}
              {step.href && <span aria-hidden="true">→</span>}
            </>
          );
          return step.href ? (
            <button type="button" onClick={goStep} className={`${cls} bg-[var(--ink)] text-[var(--paper)] hover:brightness-125`}>
              {inner}
            </button>
          ) : (
            <p role="status" className={`${cls} border border-[var(--ink-faint)] bg-white/60 text-[var(--ink)]`}>
              {inner}
            </p>
          );
        })()}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-[var(--ink-faint)] p-0.5" role="group" aria-label="Role">
            <button
              type="button"
              disabled={expired}
              onClick={() => openBuyer()}
              aria-pressed={role === "buyer"}
              className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-wide transition-colors disabled:opacity-40 ${role === "buyer" ? "bg-[var(--accent-live)] text-white" : "hover:bg-black/5"}`}
            >
              Buyer
            </button>
            <button
              type="button"
              disabled={expired}
              onClick={() => openMerchant()}
              aria-pressed={role === "merchant"}
              className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-wide transition-colors disabled:opacity-40 ${role === "merchant" ? "bg-[var(--paypal-navy)] text-white" : "hover:bg-black/5"}`}
            >
              Merchant
            </button>
          </div>
          <button type="button" disabled={expired} onClick={() => resetScenario()} className="demo-pill disabled:opacity-40">
            Reset Scenario
          </button>
          {showFreshRun && (
            <button type="button" disabled={expired} onClick={() => freshLiveRun()} className="demo-pill disabled:opacity-40">
              Fresh live run
            </button>
          )}
          {step?.href ? null : role === "buyer" ? (
            <Link href="/buyer/orders" className="demo-pill hidden md:inline-flex">
              {STORE_NAME} Orders
            </Link>
          ) : (
            <Link href="/merchant/payzap" className="demo-pill demo-pill-accent hidden md:inline-flex">
              Open PayZap
            </Link>
          )}
        </div>
      </div>
      {notice && (
        <div className="border-t border-[var(--ink-faint)] bg-amber-50 px-4 py-2 text-xs text-amber-950">
          <div className="mx-auto flex max-w-[1400px] items-start justify-between gap-4">
            <p>{notice}</p>
            <button type="button" onClick={clearNotice} className="underline">
              Dismiss
            </button>
          </div>
        </div>
      )}
      {session.hasLivePaypalRefunds && (
        <div className="border-t border-[var(--ink-faint)] px-4 py-1.5 text-[11px] text-[var(--ink-soft)]">
          <p className="mx-auto max-w-[1400px]">
            PayPal Sandbox refunds already executed on this session stay on those captures. Reset does not reverse them.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsd } from "@/lib/money";
import type { RefundStatus } from "@/lib/constants";

/** Tweens a real number to its new value so changes are visible, not jumpy. */
export function useCountUp(target: number, ms = 700): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const shownRef = useRef(target);

  useEffect(() => {
    from.current = shownRef.current;
    if (from.current === target) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(from.current + (target - from.current) * eased);
      shownRef.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return shown;
}

export function Money({ cents, className = "" }: { cents: number; className?: string }) {
  const v = useCountUp(cents);
  return <span className={`tabular-nums ${className}`}>{formatUsd(v)}</span>;
}

const REFUND_PILL: Record<RefundStatus, { label: string; cls: string; dot: string }> = {
  queued: { label: "Queued", cls: "bg-[var(--merchant-sunken)] text-[var(--merchant-muted)]", dot: "bg-[var(--merchant-border-strong)]" },
  processing: { label: "Sending to PayPal", cls: "bg-[var(--payzap-accent-soft)] text-[var(--payzap-accent)]", dot: "bg-[var(--payzap-accent)] animate-soft-pulse" },
  completed: { label: "Refunded", cls: "bg-[var(--ok-soft)] text-[var(--ok)]", dot: "bg-[var(--ok)]" },
  failed: { label: "Failed", cls: "bg-[var(--risk-soft)] text-[var(--risk)]", dot: "bg-[var(--risk)]" },
  skipped: { label: "Not covered", cls: "bg-[var(--warn-soft)] text-[var(--warn)]", dot: "bg-[var(--accent-amber)]" },
};

export function RefundPill({ status, label }: { status: RefundStatus; label?: string }) {
  const s = REFUND_PILL[status];
  return (
    <span className={`status-pill ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label ?? s.label}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

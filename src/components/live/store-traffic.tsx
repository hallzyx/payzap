"use client";

import { useEffect, useState } from "react";

/**
 * Ambient storefront traffic. This is NOT session data and never touches a
 * financial number: it is a labeled random walk so the console does not feel
 * frozen between real events.
 */
export function StoreTraffic({ compact = false }: { compact?: boolean }) {
  const [viewers, setViewers] = useState(14);
  const [carts, setCarts] = useState(3);

  useEffect(() => {
    const id = window.setInterval(() => {
      setViewers((v) => Math.max(6, Math.min(31, v + Math.round((Math.random() - 0.5) * 4))));
      setCarts((c) => Math.max(1, Math.min(7, c + (Math.random() < 0.2 ? (Math.random() < 0.5 ? -1 : 1) : 0))));
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  if (compact) {
    return (
      <p className="flex items-center gap-2 text-[11px] text-[var(--merchant-muted)]">
        <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-[var(--merchant-border-strong)]" />
        <span className="tabular-nums">{viewers} shoppers on Aster</span>
        <span className="sim-tag" title="Not real session data">Simulated</span>
      </p>
    );
  }

  return (
    <section className="card-merchant p-4" aria-label="Simulated store activity">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Storefront right now</h2>
        <span className="sim-tag text-[var(--merchant-muted)]" title="Ambient traffic for the demo. Not real session data, never used in any calculation.">
          Simulated store activity
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[11px] text-[var(--merchant-muted)]">Shoppers browsing</dt>
          <dd className="text-xl font-semibold tabular-nums transition-all">{viewers}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--merchant-muted)]">Carts open</dt>
          <dd className="text-xl font-semibold tabular-nums">{carts}</dd>
        </div>
      </dl>
    </section>
  );
}

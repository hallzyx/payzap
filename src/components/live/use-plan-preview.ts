"use client";

import { useEffect, useState } from "react";
import { useDemo } from "@/components/demo-provider";

export type PlanPreview = {
  originalPriceCents: number;
  budgetCents: number | null;
  proposedPriceCents: number | null;
  recommendedPriceCents: number | null;
  curve: Array<{ priceCents: number; exposureCents: number }>;
  coverage: Array<{
    orderId: string;
    orderNumber: string;
    buyerName: string;
    isDemoBuyer: boolean;
    covered: boolean;
    reasons: Array<{ label: string; cite: string | null }>;
    ruleChecks: Array<{ ruleId: string; label: string; passed: boolean; cite: string | null }>;
  }>;
};

/**
 * Reads /api/campaign/preview (read-only, deterministic) whenever the policy
 * or the analyzed campaign changes.
 */
export function usePlanPreview(): { preview: PlanPreview | null; loading: boolean } {
  const { state } = useDemo();
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const key = state
    ? JSON.stringify([
        state.session.id,
        state.policy,
        state.session.proposedPriceCents,
        state.session.refundBudgetCents,
        state.session.recommendedPriceCents,
      ])
    : null;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch("/api/campaign/preview", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<PlanPreview>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPreview(data);
        setLoadedKey(key);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { preview, loading: key !== loadedKey };
}

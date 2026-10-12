"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DemoState } from "@/lib/types";
import type { Role } from "@/lib/constants";
import { engineLabel, refundIsSimulated } from "@/lib/live";
import { formatUsd } from "@/lib/money";

/** One PayPal call as the read-only scanner reports it (/api/paypal/activity). */
export type PaypalCall = {
  id: string;
  kind: "sale" | "refund";
  method: string;
  path: string;
  statusCode: number | null;
  ok: boolean;
  simulated: boolean;
  observed: boolean;
  amount: string | null;
  currency: string | null;
  captureId: string | null;
  refundId: string | null;
  summary: string | null;
  durationMs: number | null;
  createdAt: string;
  buyerName: string | null;
  orderNumber: string | null;
  isDemoBuyer: boolean;
};

export type PaypalActivity = {
  host: string;
  preview: boolean;
  inflight: boolean;
  calls: PaypalCall[];
};

/**
 * A change PayZap observed in this session's real state. Nothing here is
 * invented: each event is the difference between two /api/session snapshots.
 */
export type LiveEvent = {
  id: string;
  at: number;
  tone: "info" | "ok" | "warn" | "risk" | "ai";
  title: string;
  detail?: string;
  orderNumber?: string;
  /** True when the refund behind this event never reached PayPal (preview). */
  simulated?: boolean;
  /** A completed refund seen in order state. The feed prefers the PayPal log entry. */
  refundEvent?: boolean;
};

type DemoContextValue = {
  state: DemoState | null;
  loading: boolean;
  notice: string | null;
  events: LiveEvent[];
  activity: PaypalActivity | null;
  lastSyncedAt: number | null;
  refresh: () => Promise<void>;
  generateDemo: () => Promise<void>;
  setRole: (role: Role) => Promise<void>;
  resetScenario: () => Promise<void>;
  freshLiveRun: () => Promise<void>;
  clearNotice: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

const MAX_EVENTS = 40;

function diffEvents(prev: DemoState | null, next: DemoState): LiveEvent[] {
  const now = Date.now();
  const out: LiveEvent[] = [];
  const push = (e: Omit<LiveEvent, "id" | "at">) =>
    out.push({ ...e, id: `${now}-${out.length}-${e.title}`, at: now });

  if (!prev || prev.session.id !== next.session.id) {
    push({
      tone: "info",
      title: "Console connected to this demo session",
      detail: `${next.orders.length} protected PayPal orders · ${formatUsd(
        next.metrics.protectedRevenueCents,
      )} covered`,
    });
    return out;
  }

  const p = prev.session;
  const n = next.session;

  if (prev.policy !== next.policy && JSON.stringify(prev.policy) !== JSON.stringify(next.policy)) {
    const engine = engineLabel(next.policy.source);
    const answered =
      prev.session.policyText === next.session.policyText &&
      Object.keys(next.policy.resolved).length > Object.keys(prev.policy.resolved).length;
    if (answered) {
      push({
        tone: "ai",
        title: "Merchant answered PayZap's question",
        detail: `${next.policy.rules.length} rules active${
          next.policy.ambiguities.length ? ` · ${next.policy.ambiguities.length} still open` : ""
        }`,
      });
    } else if (next.policy.source === "default") {
      push({ tone: "info", title: "Policy set back to the default demo terms" });
    } else {
      push({
        tone: "ai",
        title: `Policy compiled · ${next.policy.rules.length} rule${
          next.policy.rules.length === 1 ? "" : "s"
        }`,
        detail: `Read by ${engine.name}${
          next.policy.ambiguities.length
            ? ` · ${next.policy.ambiguities.length} question${next.policy.ambiguities.length === 1 ? "" : "s"} for you`
            : ""
        }`,
      });
    }
  }

  if (p.campaignStatus !== n.campaignStatus) {
    const a = next.analysis;
    switch (n.campaignStatus) {
      case "idle":
        push({ tone: "info", title: "Scenario reset to the opening scene" });
        break;
      case "analyzed":
        if (a) {
          push({
            tone: a.exceedsBudget ? "risk" : "ok",
            title: a.exceedsBudget
              ? `Risk found · ${formatUsd(a.totalExposureCents)} exposure at ${formatUsd(
                  a.proposedPriceCents,
                )}`
              : `Exposure ${formatUsd(a.totalExposureCents)} at ${formatUsd(
                  a.proposedPriceCents,
                )}`,
            detail: a.exceedsBudget
              ? `Over budget by ${formatUsd(a.overByCents)} · safe price ${
                  a.recommendedPriceCents != null ? formatUsd(a.recommendedPriceCents) : "—"
                }`
              : `${a.eligibleCount} orders covered by your policy`,
          });
        }
        break;
      case "accepted":
        push({
          tone: "info",
          title: `Merchant accepted ${formatUsd(n.recommendedPriceCents ?? 0)}`,
          detail: "Waiting for launch approval",
        });
        break;
      case "approved":
      case "refunding":
        if (p.campaignStatus !== "approved") {
          push({
            tone: "warn",
            title: `Price changed ${formatUsd(prev.product.priceCents)} → ${formatUsd(
              next.product.priceCents,
            )}`,
            detail: "Campaign launched · evaluating every protected order",
          });
        }
        break;
      case "completed":
        push({
          tone: "ok",
          title: `Campaign complete · ${formatUsd(next.metrics.totalRefundedCents)} returned`,
          detail: `${next.metrics.completedRefunds} refunds · no buyer claims needed`,
        });
        break;
      case "partial_failure":
        push({
          tone: "risk",
          title: `${next.metrics.failedRefunds} refund${
            next.metrics.failedRefunds === 1 ? "" : "s"
          } failed · retry available`,
          detail: `${next.metrics.completedRefunds} completed, kept as is`,
        });
        break;
    }
  }

  const before = new Map(prev.orders.map((o) => [o.id, o]));
  for (const order of next.orders) {
    const old = before.get(order.id);
    if (!old || old.refundStatus === order.refundStatus) continue;
    if (order.refundStatus === "completed") {
      const sim = refundIsSimulated(order);
      push({
        tone: "ok",
        orderNumber: order.orderNumber,
        simulated: sim,
        refundEvent: true,
        title: `${sim ? "Simulated refund" : "PayPal Sandbox refund"} ${formatUsd(
          order.priceAdjustmentCents,
        )} · ${order.buyerName}`,
        detail: order.paypalRefundId ?? undefined,
      });
    } else if (order.refundStatus === "failed") {
      push({
        tone: "risk",
        orderNumber: order.orderNumber,
        title: `Refund failed · ${order.orderNumber}`,
        detail: order.refundError?.slice(0, 80) ?? undefined,
      });
    } else if (order.refundStatus === "skipped") {
      const why = order.eligibility?.checks.find((c) => !c.passed)?.label;
      push({
        tone: "info",
        orderNumber: order.orderNumber,
        title: `Not covered · ${order.orderNumber}`,
        detail: why,
      });
    }
  }

  return out;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<DemoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [activity, setActivity] = useState<PaypalActivity | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const prevRef = useRef<DemoState | null>(null);

  const setState = useCallback((next: DemoState | null) => {
    setStateRaw(next);
    setLastSyncedAt(Date.now());
    if (!next) {
      prevRef.current = null;
      return;
    }
    const found = diffEvents(prevRef.current, next);
    prevRef.current = next;
    if (found.length > 0) {
      setEvents((list) => {
        // A new session starts a new ledger.
        const keep =
          found[0]?.title.startsWith("Console connected") ? [] : list;
        return [...found.reverse(), ...keep].slice(0, MAX_EVENTS);
      });
    }
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/session", { cache: "no-store" });
    const data = (await res.json()) as { state?: DemoState };
    setState(data.state ?? null);
  }, [setState]);

  const status = state?.session.campaignStatus;
  const fast = status === "approved" || status === "refunding";

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [sessionRes, activityRes] = await Promise.all([
          fetch("/api/session", { cache: "no-store" }),
          fetch("/api/paypal/activity", { cache: "no-store" }),
        ]);
        const data = (await sessionRes.json()) as { state?: DemoState };
        if (!cancelled) setState(data.state ?? null);
        if (activityRes.ok) {
          const act = (await activityRes.json()) as PaypalActivity;
          if (!cancelled) setActivity(act);
        }
      } catch {
        /* Keep the last snapshot if a poll misses. */
      }
    }

    void poll().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const id = setInterval(() => void poll(), fast ? 700 : 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fast, setState]);

  const generateDemo = useCallback(async () => {
    setLoading(true);
    await fetch("/api/paypal/watch", { method: "POST" }).catch(() => null);
    const res = await fetch("/api/session", { method: "POST" });
    const data = (await res.json()) as {
      state: DemoState;
      provisionError?: string;
    };
    setState(data.state);
    if (data.provisionError) setNotice(data.provisionError);
    setLoading(false);
  }, [setState]);

  const setRole = useCallback(
    async (role: Role) => {
      const res = await fetch("/api/session/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json()) as { state: DemoState };
      setState(data.state);
    },
    [setState],
  );

  const resetScenario = useCallback(async () => {
    const res = await fetch("/api/session/reset", { method: "POST" });
    const data = (await res.json()) as {
      state?: DemoState;
      error?: string;
      paypalHistoryPreserved?: boolean;
    };
    if (!res.ok) {
      setNotice(data.error ?? "Could not reset the scenario");
      return;
    }
    setState(data.state ?? null);
    setNotice(
      data.paypalHistoryPreserved
        ? "PayPal Sandbox refunds were not reversed. Start a fresh live run to bind a new capture batch."
        : "Scenario reset. Store price and local campaign state are back to the opening scene.",
    );
  }, [setState]);

  const freshLiveRun = useCallback(async () => {
    const res = await fetch("/api/session/fresh-run", { method: "POST" });
    const data = (await res.json()) as {
      state?: DemoState;
      error?: string;
      preview?: boolean;
      provisionError?: string;
    };
    if (!res.ok) {
      setNotice(data.error ?? "Could not start a fresh live run");
      return;
    }
    setState(data.state ?? null);
    const noBatch = !data.state?.session.batchId;
    setNotice(
      data.provisionError
        ? data.provisionError
        : noBatch
          ? "Earlier PayPal Sandbox refunds were not reversed. Live PayPal Sandbox capacity is temporarily unavailable."
          : data.preview
            ? "Fresh run started in preview mode on a new batch. Earlier PayPal refunds were not reversed."
            : "Fresh live run started on a new PayPal Sandbox batch. Earlier refunds were not reversed.",
    );
  }, [setState]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo(
    () => ({
      state,
      loading,
      notice,
      events,
      activity,
      lastSyncedAt,
      refresh,
      generateDemo,
      setRole,
      resetScenario,
      freshLiveRun,
      clearNotice,
    }),
    [
      state,
      loading,
      notice,
      events,
      activity,
      lastSyncedAt,
      refresh,
      generateDemo,
      setRole,
      resetScenario,
      freshLiveRun,
      clearNotice,
    ],
  );

  return (
    <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo requires DemoProvider");
  return ctx;
}

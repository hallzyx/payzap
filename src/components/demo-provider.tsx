"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DemoState } from "@/lib/types";
import type { Role } from "@/lib/constants";

type DemoContextValue = {
  state: DemoState | null;
  loading: boolean;
  notice: string | null;
  refresh: () => Promise<void>;
  generateDemo: () => Promise<void>;
  setRole: (role: Role) => Promise<void>;
  resetScenario: () => Promise<void>;
  freshLiveRun: () => Promise<void>;
  clearNotice: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/session");
    const data = (await res.json()) as { state?: DemoState };
    setState(data.state ?? null);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

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
  }, []);

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
    [],
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
  }, []);

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
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo(
    () => ({
      state,
      loading,
      notice,
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

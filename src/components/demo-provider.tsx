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
  refresh: () => Promise<void>;
  generateDemo: () => Promise<void>;
  setRole: (role: Role) => Promise<void>;
  resetScenario: () => Promise<void>;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);
  const [loading, setLoading] = useState(true);

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
    const res = await fetch("/api/session", { method: "POST" });
    const data = (await res.json()) as { state: DemoState };
    setState(data.state);
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
    const data = (await res.json()) as { state: DemoState };
    setState(data.state);
  }, []);

  const value = useMemo(
    () => ({
      state,
      loading,
      refresh,
      generateDemo,
      setRole,
      resetScenario,
    }),
    [state, loading, refresh, generateDemo, setRole, resetScenario],
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

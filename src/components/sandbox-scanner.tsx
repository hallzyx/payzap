"use client";

import { useEffect, useRef, useState } from "react";

type PaypalCall = {
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

type Activity = {
  host: string;
  preview: boolean;
  inflight: boolean;
  calls: PaypalCall[];
};

function clock(iso: string) {
  const date = new Date(iso);
  const base = date.toLocaleTimeString("en-GB", { hour12: false });
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${base}.${ms}`;
}

export function SandboxScanner() {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(false);
  const opened = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    async function tick() {
      try {
        const res = await fetch("/api/paypal/activity", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Activity;
          if (!cancelled) setActivity(data);
        }
      } catch {
        /* The panel stays on the last snapshot if the poll misses. */
      } finally {
        if (!cancelled) timer = window.setTimeout(tick, open ? 600 : 2000);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) {
      opened.current = false;
      return;
    }
    const el = scroller.current;
    if (!el) return;
    if (!opened.current) {
      opened.current = true;
      stick.current = Boolean(activity?.inflight);
      el.scrollTop = stick.current ? el.scrollHeight : 0;
      return;
    }
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [open, activity?.calls.length, activity?.inflight]);

  const calls = activity?.calls ?? [];
  const sales = calls.filter((call) => call.kind === "sale" && call.ok).length;
  const refunds = calls.filter((call) => call.kind === "refund" && call.ok).length;
  const live = activity?.inflight || calls.some((call) => Date.now() - new Date(call.createdAt).getTime() < 4000);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2">
      {open && (
        <section
          role="dialog"
          aria-label="PayPal Sandbox request scanner"
          className="pointer-events-auto flex max-h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#14315f] bg-[#001433] text-white shadow-2xl shadow-[#001433]/40"
        >
          <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#8eb6e8]">
                Read only
              </p>
              <h2 className="text-sm font-medium">PayPal Sandbox</h2>
              <p className="mt-0.5 font-mono text-[10px] text-white/55">
                {activity?.host ?? "api-m.sandbox.paypal.com"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-2 py-1 text-xs text-white/70 hover:bg-white/10"
            >
              Close
            </button>
          </header>
          <p className="border-b border-white/10 px-4 py-2 text-[11px] text-white/70">
            {sales} payment{sales === 1 ? "" : "s"} · {refunds} refund{refunds === 1 ? "" : "s"}
            {activity?.preview ? " · preview" : ""}
          </p>
          <div
            ref={scroller}
            onScroll={(event) => {
              const el = event.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
            }}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3"
          >
            {calls.length === 0 ? (
              <p className="px-1 py-6 text-xs leading-relaxed text-white/70">
                {activity?.preview
                  ? "This demo is in preview. PayZap has not called PayPal Sandbox for these orders."
                  : "Waiting for Sandbox calls. Generate the live demo to open the 10 protected payments, including this session. Launching the campaign lists each refund here. Nothing in this window sends a payment."}
              </p>
            ) : (
              calls.map((call) => (
                <article
                  key={call.id}
                  className={`rounded-xl border px-3 py-2 ${
                    call.ok ? "border-white/10 bg-white/[0.04]" : "border-rose-400/40 bg-rose-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                    <span className="text-white/50">{clock(call.createdAt)}</span>
                    <span className="text-white/80">
                      {call.method}{" "}
                      <span className={call.ok ? "text-emerald-300" : "text-rose-300"}>
                        {call.statusCode ?? (call.simulated ? "preview" : "done")}
                      </span>
                      {call.durationMs != null ? ` · ${call.durationMs}ms` : ""}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-[11px] text-[#d6e6ff]">
                    {call.path}
                  </p>
                  <p className="mt-1 break-words text-[11px] leading-snug text-white/80">
                    {call.kind === "refund" ? "Refund" : "Payment"}
                    {call.amount ? ` $${call.amount}` : ""}
                    {call.summary ? ` · ${call.summary}` : ""}
                  </p>
                  {!call.observed && !call.simulated && (
                    <p className="text-[10px] text-white/40">Earlier Sandbox call</p>
                  )}
                  {(call.buyerName || call.orderNumber || call.isDemoBuyer) && (
                    <p className="mt-1 break-words text-[11px] text-white/70">
                      {call.orderNumber} {call.buyerName}
                      {call.isDemoBuyer ? " · This session" : ""}
                    </p>
                  )}
                  {call.captureId && (
                    <p className="mt-1 break-all font-mono text-[10px] text-white/45">
                      capture {call.captureId}
                    </p>
                  )}
                  {call.refundId && (
                    <p className="break-all font-mono text-[10px] text-white/45">
                      refund {call.refundId}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-label="PayPal Sandbox request scanner"
        onClick={() => setOpen((value) => !value)}
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#001c64] px-3.5 py-2.5 text-xs font-medium text-white shadow-lg shadow-[#001c64]/30"
      >
        <span className="relative flex h-2 w-2">
          {live && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          )}
          <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Sandbox
        {calls.length > 0 && (
          <span className="tabular-nums text-white/70">{calls.length}</span>
        )}
      </button>
    </div>
  );
}

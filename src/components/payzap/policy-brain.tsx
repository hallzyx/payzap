"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { Spinner } from "@/components/live/primitives";
import type { PlanPreview } from "@/components/live/use-plan-preview";
import {
  EXAMPLE_POLICY_CLEAR,
  EXAMPLE_POLICY_VAGUE,
  POLICY_TEXT_MAX_CHARS,
} from "@/lib/constants";
import { engineLabel } from "@/lib/live";
import type { PolicyRule } from "@/lib/policy/schema";

const RULE_KIND: Record<PolicyRule["type"], { tag: string; icon: string }> = {
  window: { tag: "Window", icon: "◷" },
  exclude_coupon: { tag: "Exclusion", icon: "⊘" },
  exclude_condition: { tag: "Exclusion", icon: "⊘" },
};

type Span = { start: number; end: number; kind: "rule" | "ask"; id: string };

/** Finds each quoted span in the merchant's text so it can be highlighted. */
function locateSpans(text: string, quotes: Array<{ id: string; quote: string; kind: Span["kind"] }>): Span[] {
  const lower = text.toLowerCase();
  const spans: Span[] = [];
  for (const q of quotes) {
    const needle = q.quote.toLowerCase().trim();
    if (!needle) continue;
    const at = lower.indexOf(needle);
    if (at < 0) continue;
    const span = { start: at, end: at + needle.length, kind: q.kind, id: q.id };
    if (spans.some((s) => span.start < s.end && s.start < span.end)) continue;
    spans.push(span);
  }
  return spans.sort((a, b) => a.start - b.start);
}

function HighlightedText({
  text,
  spans,
  activeId,
  onHover,
}: {
  text: string;
  spans: Span[];
  activeId: string | null;
  onHover: (id: string | null) => void;
}) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  spans.forEach((s) => {
    if (s.start > cursor) parts.push(text.slice(cursor, s.start));
    parts.push(
      <mark
        key={s.id}
        className={s.kind === "rule" ? "quote-hit" : "quote-ask"}
        data-active={activeId === s.id}
        onMouseEnter={() => onHover(s.id)}
        onMouseLeave={() => onHover(null)}
      >
        {text.slice(s.start, s.end)}
      </mark>,
    );
    cursor = s.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export function PolicyBrain({
  preview,
  previewLoading,
}: {
  preview: PlanPreview | null;
  previewLoading: boolean;
}) {
  const { state, refresh } = useDemo();
  const [draft, setDraft] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [answering, setAnswering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRule, setActiveRule] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const policy = state?.policy;
  const session = state?.session;

  const compiledText = session?.policyText ?? "";
  const value = draft ?? compiledText;
  const dirty = draft != null && draft.trim() !== compiledText.trim();

  const spans = useMemo(() => {
    if (!policy || !compiledText) return [];
    return locateSpans(compiledText, [
      ...policy.rules.map((r) => ({ id: r.id, quote: r.sourceSpan, kind: "rule" as const })),
      ...policy.ambiguities.map((a) => ({ id: a.id, quote: a.sourceSpan, kind: "ask" as const })),
    ]);
  }, [policy, compiledText]);

  const ruleImpact = useMemo(() => {
    const map = new Map<string, { excluded: string[]; checked: number }>();
    for (const c of preview?.coverage ?? []) {
      for (const rc of c.ruleChecks) {
        const entry = map.get(rc.ruleId) ?? { excluded: [], checked: 0 };
        entry.checked += 1;
        if (!rc.passed) entry.excluded.push(c.orderNumber);
        map.set(rc.ruleId, entry);
      }
    }
    return map;
  }, [preview]);

  if (!state || !policy || !session) return null;

  const locked =
    session.expired ||
    ["approved", "refunding", "completed", "partial_failure"].includes(session.campaignStatus);
  const engine = engineLabel(policy.source);
  const isDefault = policy.source === "default";
  const showEditor = editing || dirty || isDefault || !compiledText;

  async function post(url: string, body: unknown): Promise<boolean> {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not update the policy");
      return false;
    }
    await refresh();
    return true;
  }

  async function compile() {
    setCompiling(true);
    const ok = await post("/api/policy/compile", { text: value });
    if (ok) {
      setDraft(null);
      setEditing(false);
    }
    setCompiling(false);
  }

  async function useDefault() {
    setCompiling(true);
    const ok = await post("/api/policy/compile", { useDefault: true });
    if (ok) {
      setDraft(null);
      setEditing(false);
    }
    setCompiling(false);
  }

  async function answer(ambiguityId: string, optionId: string) {
    setAnswering(`${ambiguityId}:${optionId}`);
    await post("/api/policy/resolve", { ambiguityId, optionId });
    setAnswering(null);
  }

  const coverage = preview?.coverage ?? [];
  const coveredCount = coverage.filter((c) => c.covered).length;

  return (
    <section className="card-merchant overflow-hidden" aria-labelledby="policy-title">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--merchant-border)] bg-gradient-to-r from-[var(--ai-soft)] to-white px-5 py-4">
        <div>
          <p className="eyebrow text-[var(--ai)]">Step 1 · Your guarantee, compiled</p>
          <h2 id="policy-title" className="mt-1 text-lg font-semibold">
            Price-protection policy
          </h2>
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-[var(--merchant-muted)]">
            Paste the terms you already publish. PayZap reads them into verifiable rules,
            quotes your own words for each one, and asks when something is unclear.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--ai-border)] bg-white px-3 py-1.5 text-[11px]">
          <span className={`h-2 w-2 rounded-full ${engine.model ? "bg-[var(--ai)]" : "bg-[var(--merchant-border-strong)]"}`} />
          <span>
            Read by <strong>{engine.name}</strong>
            <span className="text-[var(--merchant-muted)]"> · {engine.detail}</span>
          </span>
        </div>
      </header>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Source text */}
        <div className="border-b border-[var(--merchant-border)] p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-[var(--merchant-muted)]">Your words</p>
            {!showEditor && !locked && (
              <button type="button" onClick={() => { setEditing(true); setDraft(compiledText); }} className="text-xs font-medium text-[var(--payzap-accent)] hover:underline">
                Edit
              </button>
            )}
          </div>
          {showEditor ? (
            <>
              <textarea
                aria-label="Price-protection policy text"
                value={value}
                onChange={(e) => setDraft(e.target.value)}
                disabled={locked || compiling}
                maxLength={POLICY_TEXT_MAX_CHARS}
                rows={5}
                placeholder="Price protection lasts 7 days after purchase…"
                className="field mt-2 resize-none"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="chip" disabled={locked || compiling} onClick={() => setDraft(EXAMPLE_POLICY_CLEAR)}>
                  Example: clear policy
                </button>
                <button type="button" className="chip" disabled={locked || compiling} onClick={() => setDraft(EXAMPLE_POLICY_VAGUE)}>
                  Example: vague policy
                </button>
                {!isDefault && (
                  <button type="button" className="chip" disabled={locked || compiling} onClick={useDefault}>
                    Back to default
                  </button>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={locked || compiling || value.trim().length === 0 || (!dirty && !isDefault && !!compiledText)}
                  onClick={compile}
                >
                  {compiling ? <><Spinner /> Reading your policy…</> : "Compile policy"}
                </button>
                {editing && !dirty && !isDefault && (
                  <button type="button" className="text-xs text-[var(--merchant-muted)] hover:underline" onClick={() => { setEditing(false); setDraft(null); }}>
                    Cancel
                  </button>
                )}
              </div>
            </>
          ) : (
            <blockquote className="mt-2 rounded-lg border border-[var(--merchant-border)] bg-[var(--merchant-sunken)] p-3 text-sm leading-relaxed">
              <HighlightedText text={compiledText} spans={spans} activeId={activeRule} onHover={setActiveRule} />
            </blockquote>
          )}
          {isDefault && !compiledText && (
            <p className="mt-3 text-[11px] text-[var(--merchant-muted)]">
              Running on the built-in demo terms until you compile your own.
            </p>
          )}
          {locked && (
            <p className="mt-3 text-[11px] text-[var(--merchant-muted)]">
              Locked while this campaign is live. Reset the scenario to change it.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-[var(--risk)]" role="alert">{error}</p>}
        </div>

        {/* Compiled rules */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-[var(--merchant-muted)]">Rules PayZap will enforce</p>
            <p className="text-[11px] text-[var(--merchant-muted)]">
              {policy.rules.length} rule{policy.rules.length === 1 ? "" : "s"}
            </p>
          </div>

          {compiling ? (
            <ul className="mt-3 space-y-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="scan-bar rounded-lg border border-[var(--ai-border)] bg-[var(--ai-soft)]/50 p-3">
                  <div className="skeleton h-3 w-2/3" />
                  <div className="skeleton mt-2 h-2.5 w-5/6" />
                </li>
              ))}
              <li className="text-[11px] text-[var(--ai)]">
                Matching each rule to a quote in your text. Rules that cannot quote you are dropped.
              </li>
            </ul>
          ) : (
            <ul className="mt-3 space-y-2">
              {policy.rules.map((rule, i) => {
                const kind = RULE_KIND[rule.type];
                const impact = ruleImpact.get(rule.id);
                const active = activeRule === rule.id;
                return (
                  <li
                    key={rule.id}
                    onMouseEnter={() => setActiveRule(rule.id)}
                    onMouseLeave={() => setActiveRule(null)}
                    className={`animate-fade-up rounded-lg border p-3 transition-colors ${
                      active ? "border-[var(--ai)] bg-[var(--ai-soft)]" : "border-[var(--merchant-border)] bg-white"
                    }`}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--ai-soft)] text-sm text-[var(--ai)]">
                        {kind.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {rule.summary}
                          <span className="rounded bg-[var(--merchant-sunken)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--merchant-muted)]">
                            {kind.tag}
                          </span>
                        </p>
                        {isDefault ? (
                          <p className="mt-1 text-[11px] text-[var(--merchant-muted)]">Default demo policy</p>
                        ) : (
                          <p className="mt-1 text-xs italic text-[var(--ai)]">“{rule.sourceSpan}”</p>
                        )}
                        {impact && (
                          <p className="mt-1.5 text-[11px] text-[var(--merchant-muted)]">
                            {impact.excluded.length > 0 ? (
                              <>
                                <strong className="text-[var(--warn)]">Excludes {impact.excluded.length}</strong>{" "}
                                · {impact.excluded.join(", ")}
                              </>
                            ) : (
                              <>Checked on {impact.checked} orders · none excluded</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
              {policy.rules.length === 0 && (
                <li className="rounded-lg border border-dashed border-[var(--merchant-border-strong)] p-3 text-xs text-[var(--merchant-muted)]">
                  No rules yet. Answer the question below.
                </li>
              )}
            </ul>
          )}

          {policy.discarded > 0 && !compiling && (
            <p className="mt-3 flex gap-2 rounded-md bg-[var(--warn-soft)] px-3 py-2 text-[11px] text-[var(--warn)]">
              <span aria-hidden="true">⚑</span>
              {policy.discarded} suggested rule{policy.discarded === 1 ? "" : "s"}{" "}
              {policy.discarded === 1 ? "was" : "were"} discarded because{" "}
              {policy.discarded === 1 ? "it" : "they"} did not quote your text.
            </p>
          )}

          {policy.ambiguities.map((q) => (
            <div
              key={q.id}
              className="animate-drop-in mt-3 rounded-lg border border-[var(--warn-border)] bg-[var(--warn-soft)] p-3.5"
              role="group"
              aria-label="Clarifying question"
            >
              <p className="eyebrow text-[var(--warn)]">PayZap needs your answer</p>
              <p className="mt-1 text-sm font-medium text-[var(--merchant-text)]">{q.question}</p>
              <p className="mt-1 text-xs italic text-[var(--warn)]">You wrote: “{q.sourceSpan}”</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {q.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={locked || answering != null}
                    onClick={() => answer(q.id, option.id)}
                    className="chip border-[var(--warn-border)]"
                  >
                    {answering === `${q.id}:${option.id}` && <Spinner />}
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-[var(--merchant-muted)]">
                PayZap asks instead of guessing. Analysis waits for your answer.
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Coverage strip: who this policy covers, computed by code. */}
      <div className="border-t border-[var(--merchant-border)] bg-[var(--merchant-sunken)] px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs">
            <span className="font-semibold">Who this policy covers</span>{" "}
            <span className="text-[var(--merchant-muted)]">· checked by PayZap rules code on each order</span>
          </p>
          <p className="text-xs tabular-nums">
            {previewLoading && !preview ? "…" : (
              <>
                <strong className="text-[var(--ok)]">{coveredCount} covered</strong>
                {coverage.length - coveredCount > 0 && (
                  <> · <strong className="text-[var(--warn)]">{coverage.length - coveredCount} not covered</strong></>
                )}
              </>
            )}
          </p>
        </div>
        <ul className={`mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10 ${previewLoading ? "opacity-60" : ""} transition-opacity`}>
          {(coverage.length ? coverage : Array.from({ length: 10 }, () => null)).map((c, i) =>
            c ? (
              <li
                key={c.orderId}
                tabIndex={0}
                title={c.covered ? `${c.orderNumber} · ${c.buyerName} · covered` : `${c.orderNumber} · ${c.reasons.map((r) => r.label).join(", ")}`}
                className={`group relative rounded-md border px-1.5 py-2 text-center text-[10px] leading-tight transition-colors ${
                  c.covered
                    ? "border-[var(--ok)]/30 bg-[var(--ok-soft)] text-[var(--ok)]"
                    : "border-[var(--warn-border)] bg-[var(--warn-soft)] text-[var(--warn)]"
                }`}
              >
                <span className="block font-mono">{c.orderNumber.replace(/^[A-Z]+-/, "")}</span>
                <span className="block truncate text-[var(--merchant-muted)]">{c.isDemoBuyer ? "you" : c.buyerName.split(" ")[0]}</span>
                <span aria-hidden="true">{c.covered ? "✓" : "✕"}</span>
              </li>
            ) : (
              <li key={i} className="skeleton h-[52px]" />
            ),
          )}
        </ul>
        {coverage.some((c) => !c.covered) && (
          <ul className="mt-3 space-y-1.5 text-xs">
            {coverage.filter((c) => !c.covered).map((c) => (
              <li key={c.orderId} className="flex flex-wrap gap-x-2">
                <span className="font-mono text-[var(--merchant-muted)]">{c.orderNumber}</span>
                <span className="font-medium">{c.buyerName}</span>
                <span className="text-[var(--warn)]">{c.reasons.map((r) => r.label).join(" · ")}</span>
                {c.reasons.find((r) => r.cite && r.cite !== "Default demo policy") && (
                  <span className="italic text-[var(--ai)]">
                    “{c.reasons.find((r) => r.cite && r.cite !== "Default demo policy")!.cite}”
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

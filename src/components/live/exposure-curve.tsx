"use client";

import { useMemo, useState } from "react";
import type { PlanPreview } from "@/components/live/use-plan-preview";
import { formatUsd } from "@/lib/money";

const W = 560;
const H = 200;
const PAD = { l: 52, r: 16, t: 14, b: 30 };

/**
 * Refund exposure as a function of the promotional price, computed by
 * PayZap's deterministic policy code (no model). Lets the merchant scrub a
 * price and watch the exposure move against the budget.
 */
export function ExposureCurve({ preview }: { preview: PlanPreview }) {
  const { curve, budgetCents, proposedPriceCents, recommendedPriceCents } = preview;
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    const minP = curve[0]?.priceCents ?? 0;
    const maxP = curve[curve.length - 1]?.priceCents ?? 1;
    const maxE = Math.max(
      1,
      ...curve.map((c) => c.exposureCents),
      budgetCents ?? 0,
    ) * 1.08;
    const x = (p: number) => PAD.l + ((p - minP) / Math.max(1, maxP - minP)) * (W - PAD.l - PAD.r);
    const y = (e: number) => PAD.t + (1 - e / maxE) * (H - PAD.t - PAD.b);
    const path = curve
      .map((c, i) => `${i === 0 ? "M" : "L"}${x(c.priceCents).toFixed(1)},${y(c.exposureCents).toFixed(1)}`)
      .join(" ");
    const area = `${path} L${x(maxP).toFixed(1)},${y(0)} L${x(minP).toFixed(1)},${y(0)} Z`;
    const yTicks = [0, maxE / 2, maxE].map((v) => Math.round(v / 50_000) * 50_000);
    const xTicks: number[] = [];
    for (let p = Math.ceil(minP / 10_000) * 10_000; p <= maxP; p += 10_000) xTicks.push(p);
    return { x, y, path, area, minP, maxP, yTicks, xTicks };
  }, [curve, budgetCents]);

  const at = (price: number) =>
    curve.reduce((best, c) =>
      Math.abs(c.priceCents - price) < Math.abs(best.priceCents - price) ? c : best,
    curve[0]);

  const active = hover != null ? at(hover) : null;
  const marker = (price: number | null, color: string, label: string, side: "left" | "right") => {
    if (price == null) return null;
    const point = at(price);
    return (
      <g>
        <circle
          cx={geo.x(point.priceCents)}
          cy={geo.y(point.exposureCents)}
          r={5}
          fill={color}
          stroke="#fff"
          strokeWidth={2}
        />
        <text
          x={geo.x(point.priceCents) + (side === "left" ? -8 : 8)}
          y={geo.y(point.exposureCents) + (side === "left" ? -8 : 16)}
          textAnchor={side === "left" ? "end" : "start"}
          className="fill-[var(--merchant-text)] text-[10px] font-semibold"
        >
          {label}
        </text>
      </g>
    );
  };

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const ratio = (px - PAD.l) / (W - PAD.l - PAD.r);
    if (ratio < 0 || ratio > 1) return setHover(null);
    setHover(geo.minP + ratio * (geo.maxP - geo.minP));
  }

  const overBudget =
    active && budgetCents != null && active.exposureCents > budgetCents;

  return (
    <figure className="relative">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-[var(--merchant-muted)]">
        <span>
          <span className="font-semibold text-[var(--merchant-text)]">Exposure by sale price</span>{" "}
          · computed by PayZap rules code, not a model
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4 bg-[var(--payzap-accent)]" /> Exposure
          </span>
          {budgetCents != null && (
            <span className="flex items-center gap-1">
              <span className="h-0 w-4 border-t-2 border-dashed border-[var(--risk)]" /> Budget
            </span>
          )}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label="Refund exposure by promotional price"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {geo.yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={geo.y(t)} y2={geo.y(t)} stroke="#e9edf2" />
            <text x={PAD.l - 8} y={geo.y(t) + 3} textAnchor="end" className="fill-[var(--merchant-muted)] text-[10px] tabular-nums">
              {formatUsd(t)}
            </text>
          </g>
        ))}
        {geo.xTicks.map((t) => (
          <text key={`x${t}`} x={geo.x(t)} y={H - 10} textAnchor="middle" className="fill-[var(--merchant-muted)] text-[10px] tabular-nums">
            {formatUsd(t)}
          </text>
        ))}
        <path d={geo.area} fill="var(--payzap-accent)" opacity={0.08} />
        <path d={geo.path} fill="none" stroke="var(--payzap-accent)" strokeWidth={2} strokeLinejoin="round" />
        {budgetCents != null && (
          <g>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={geo.y(budgetCents)}
              y2={geo.y(budgetCents)}
              stroke="var(--risk)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text x={W - PAD.r} y={geo.y(budgetCents) - 5} textAnchor="end" className="fill-[var(--risk)] text-[10px] font-semibold">
              Budget {formatUsd(budgetCents)}
            </text>
          </g>
        )}
        {marker(proposedPriceCents, "var(--risk)", `Asked ${proposedPriceCents != null ? formatUsd(proposedPriceCents) : ""}`, "left")}
        {recommendedPriceCents != null && recommendedPriceCents !== proposedPriceCents &&
          marker(recommendedPriceCents, "var(--ok)", `Safe ${formatUsd(recommendedPriceCents)}`, "right")}
        {active && (
          <g pointerEvents="none">
            <line x1={geo.x(active.priceCents)} x2={geo.x(active.priceCents)} y1={PAD.t} y2={H - PAD.b} stroke="#9aa6b2" strokeDasharray="2 3" />
            <circle cx={geo.x(active.priceCents)} cy={geo.y(active.exposureCents)} r={4} fill="var(--merchant-text)" />
          </g>
        )}
      </svg>
      <div className="mt-1 min-h-[1.5rem] text-xs" aria-live="polite">
        {active ? (
          <p className="tabular-nums">
            At <strong>{formatUsd(active.priceCents)}</strong> refunds total{" "}
            <strong className={overBudget ? "text-[var(--risk)]" : "text-[var(--ok)]"}>
              {formatUsd(active.exposureCents)}
            </strong>
            {budgetCents != null && (
              <span className="text-[var(--merchant-muted)]">
                {" "}
                · {overBudget
                  ? `${formatUsd(active.exposureCents - budgetCents)} over budget`
                  : `${formatUsd(budgetCents - active.exposureCents)} under budget`}
              </span>
            )}
          </p>
        ) : (
          <p className="text-[var(--merchant-muted)]">Hover the curve to try another price. Nothing changes until you approve.</p>
        )}
      </div>
    </figure>
  );
}

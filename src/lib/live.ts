import type { PolicySource } from "@/lib/policy/schema";
import type { DemoState, OrderView } from "@/lib/types";

/** Refund ids PayZap makes up in preview mode. They never reached PayPal. */
export function isSimulatedRefundId(id: string | null | undefined): boolean {
  return !id || id.startsWith("SIM-") || id.startsWith("PREVIEW-");
}

export function refundIsSimulated(order: OrderView): boolean {
  return (
    isSimulatedRefundId(order.paypalRefundId) ||
    Boolean(order.paypalCaptureId?.startsWith("SANDBOX-CAP-"))
  );
}

/** Which engine read the merchant's words. Shown next to every compiled rule. */
export function engineLabel(source: PolicySource | "deterministic"): {
  name: string;
  detail: string;
  model: boolean;
} {
  switch (source) {
    case "deepseek":
      return { name: "DeepSeek Flash", detail: "language model", model: true };
    case "openai":
      return { name: "GPT-6 Luna", detail: "language model", model: true };
    case "deterministic":
      return {
        name: "PayZap keyword parser",
        detail: "no model configured",
        model: false,
      };
    default:
      return { name: "Built-in demo terms", detail: "default policy", model: false };
  }
}

export type Stage =
  | "policy"
  | "plan"
  | "review"
  | "approve"
  | "refund"
  | "buyer";

export function stageOf(state: DemoState): Stage {
  switch (state.session.campaignStatus) {
    case "idle":
      return state.policy.ambiguities.length > 0 ? "policy" : "plan";
    case "analyzed":
      return "review";
    case "accepted":
      return "approve";
    case "approved":
    case "refunding":
      return "refund";
    default:
      return "buyer";
  }
}

export function demoOrderOf(state: DemoState): OrderView | undefined {
  return state.orders.find((o) => o.isDemoBuyer) ?? state.orders[0];
}

export function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export function timeAgo(iso: string | number, now: number): string {
  const t = typeof iso === "number" ? iso : new Date(iso).getTime();
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function clockTime(t: number | string): string {
  return new Date(t).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

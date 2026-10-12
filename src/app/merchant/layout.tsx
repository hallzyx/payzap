"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DemoBar } from "@/components/demo-bar";
import { SessionExpired } from "@/components/session-expired";
import { useDemo } from "@/components/demo-provider";
import { STORE_NAME } from "@/lib/constants";
import { stageOf } from "@/lib/live";

type NavItem = {
  href: string;
  label: string;
  hint?: string;
  product?: boolean;
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Home",
    items: [{ href: "/merchant/overview", label: "Summary" }],
  },
  {
    label: "Activity",
    items: [{ href: "/merchant/orders", label: "Orders" }],
  },
  {
    label: "Catalog",
    items: [{ href: "/merchant/products", label: "Products" }],
  },
  {
    label: "PayPal products",
    items: [
      {
        href: "/merchant/payzap",
        label: "PayZap",
        hint: "Price protection",
        product: true,
      },
      {
        href: "/merchant/checkout",
        label: "Checkout",
        hint: "Online payments",
      },
    ],
  },
];

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, loading } = useDemo();
  const expired = Boolean(state?.session.expired);

  useEffect(() => {
    if (!loading && !state) router.replace("/");
  }, [loading, state, router]);

  if (!state) return null;

  const stage = stageOf(state);
  const payzapBadge =
    stage === "policy"
      ? { text: `${state.policy.ambiguities.length} question${state.policy.ambiguities.length === 1 ? "" : "s"}`, cls: "bg-[var(--warn-soft)] text-[var(--warn)]" }
      : stage === "review"
        ? { text: "Review", cls: "bg-[var(--risk-soft)] text-[var(--risk)]" }
        : stage === "approve"
          ? { text: "Approve", cls: "bg-[var(--ok-soft)] text-[var(--ok)]" }
          : stage === "refund"
            ? { text: "Live", cls: "bg-[var(--payzap-accent)] text-white animate-soft-pulse" }
            : null;

  return (
    <div className="merchant-shell flex min-h-screen flex-col">
      <DemoBar />
      <div className="flex min-h-0 flex-1">
        <aside className="merchant-side hidden w-60 shrink-0 flex-col lg:flex">
          <div className="border-b border-[var(--merchant-border)] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--payzap-accent)]">
              PayPal Business
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight">{STORE_NAME}</p>
            <p className="mt-0.5 font-mono text-[11px] text-[var(--merchant-muted)]">
              {state.session.merchantId}
            </p>
          </div>
          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
            {GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--merchant-muted)]">
                  {group.label}
                </p>
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname.startsWith(item.href);
                    const product = Boolean(item.product);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                          active
                            ? "bg-[#e8f3fb] font-medium text-[var(--paypal-navy)]"
                            : "text-[var(--merchant-text)] hover:bg-[#f4f7fa]"
                        }`}
                      >
                        {product && (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--payzap-accent)] text-[10px] font-bold text-white">
                            PZ
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2 leading-tight">
                            {item.label}
                            {product && payzapBadge && (
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${payzapBadge.cls}`}>
                                {payzapBadge.text}
                              </span>
                            )}
                          </span>
                          {"hint" in item && item.hint && (
                            <span className="block text-[11px] font-normal text-[var(--merchant-muted)]">
                              {item.hint}
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-[var(--merchant-border)] px-5 py-4 text-[11px] text-[var(--merchant-muted)]">
            <p className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ok)] opacity-50" />
                <span className="relative h-2 w-2 rounded-full bg-[var(--ok)]" />
              </span>
              Connected · {state.session.isPreview ? "Sandbox preview" : "PayPal Sandbox"}
            </p>
            <p className="mt-1">Demo account. Not a production PayPal account.</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-1 overflow-x-auto border-b border-[var(--merchant-border)] bg-white px-3 py-2 lg:hidden">
            {GROUPS.flatMap((group) => group.items).map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs ${
                    active
                      ? "bg-[#e8f3fb] font-medium text-[var(--paypal-navy)]"
                      : "text-[var(--merchant-muted)]"
                  }`}
                >
                  {item.label}
                  {item.product && payzapBadge && <span className="ml-1">·</span>}
                </Link>
              );
            })}
          </div>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 xl:px-8">
            {expired ? <SessionExpired /> : children}
          </main>
        </div>
      </div>
    </div>
  );
}

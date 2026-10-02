"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DemoBar } from "@/components/demo-bar";
import { SessionExpired } from "@/components/session-expired";
import { useDemo } from "@/components/demo-provider";
import { STORE_NAME } from "@/lib/constants";

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

  return (
    <div className="merchant-shell flex min-h-screen flex-col">
      <DemoBar />
      <div className="flex min-h-0 flex-1">
        <aside className="merchant-side hidden w-64 shrink-0 flex-col lg:flex">
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
                        <span>
                          <span className="block leading-tight">{item.label}</span>
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
                </Link>
              );
            })}
          </div>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
            {expired ? <SessionExpired /> : children}
          </main>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoBar } from "@/components/demo-bar";
import { STORE_NAME } from "@/lib/constants";

const NAV = [
  { href: "/merchant/overview", label: "Overview" },
  { href: "/merchant/products", label: "Products" },
  { href: "/merchant/orders", label: "Orders" },
  { href: "/merchant/payzap", label: "PayZap" },
];

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="merchant-shell flex min-h-screen flex-col">
      <DemoBar />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-0 px-4 py-6 lg:gap-8">
        <aside className="hidden w-48 shrink-0 lg:block">
          <p className="text-xs uppercase tracking-widest text-[var(--merchant-muted)]">
            {STORE_NAME} Admin
          </p>
          <nav className="mt-6 space-y-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    active
                      ? "bg-[var(--merchant-border)] text-white"
                      : "text-[var(--merchant-muted)] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="mt-8 text-[10px] text-[var(--merchant-muted)]">
            Apps &amp; Automations
          </p>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <nav className="flex gap-2 border-t border-[var(--merchant-border)] px-4 py-2 lg:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-xs text-[var(--merchant-muted)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

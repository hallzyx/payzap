"use client";

import Link from "next/link";
import { useDemo } from "@/components/demo-provider";

export function StoreHeader() {
  const { state } = useDemo();
  const buyerId = state?.session.buyerId;

  return (
    <header className="border-b border-[var(--ink-faint)] bg-[var(--surface-elevated)]/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/buyer/orders" className="store-mark text-sm text-[var(--ink)]">
          ASTER
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/buyer/orders" className="text-[var(--ink)]">
            Orders
          </Link>
          {buyerId && (
            <span className="hidden font-mono text-xs text-[var(--muted)] sm:inline">
              {buyerId}
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}

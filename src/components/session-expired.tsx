"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/components/demo-provider";

export function SessionExpired() {
  const { generateDemo } = useDemo();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function startAgain() {
    setBusy(true);
    await generateDemo();
    router.push("/buyer/orders");
    setBusy(false);
  }

  return (
    <div className="card-buyer mx-auto max-w-lg px-8 py-10 text-[var(--ink)]">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
        Demo session
      </p>
      <h1
        className="mt-3 text-3xl text-[var(--ink)]"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        This demo has expired
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--ink-soft)]">
        New refunds cannot run on a session older than 30 minutes. PayPal Sandbox
        refunds already executed stay on those captures and are not reversed.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={startAgain}
        className="mt-8 rounded-full bg-[var(--accent-live)] px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Creating demo…" : "Generate Live Demo"}
      </button>
    </div>
  );
}

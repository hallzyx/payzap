"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DemoBar } from "@/components/demo-bar";
import { SessionExpired } from "@/components/session-expired";
import { StoreHeader } from "@/components/store-header";
import { useDemo } from "@/components/demo-provider";

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { state, loading } = useDemo();
  const expired = Boolean(state?.session.expired);

  useEffect(() => {
    if (!loading && !state) router.replace("/");
  }, [loading, state, router]);

  if (!loading && !state) return null;

  return (
    <div className="buyer-shell min-h-screen">
      <DemoBar />
      {expired ? (
        <main className="px-4">
          <SessionExpired />
        </main>
      ) : (
        <>
          <StoreHeader />
          {children}
        </>
      )}
    </div>
  );
}

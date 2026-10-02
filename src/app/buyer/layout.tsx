"use client";

import { DemoBar } from "@/components/demo-bar";
import { SessionExpired } from "@/components/session-expired";
import { useDemo } from "@/components/demo-provider";

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useDemo();
  const expired = Boolean(state?.session.expired);

  return (
    <div className="buyer-shell min-h-screen">
      <DemoBar />
      {expired ? (
        <main className="px-4">
          <SessionExpired />
        </main>
      ) : (
        children
      )}
    </div>
  );
}

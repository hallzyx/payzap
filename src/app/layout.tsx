import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { DemoProvider } from "@/components/demo-provider";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PayZap — Price protection for merchants",
  description:
    "Live demo: understand refund exposure before you drop prices, then honor guarantees through PayPal Sandbox.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full antialiased">
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}

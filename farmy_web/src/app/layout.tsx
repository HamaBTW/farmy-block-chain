import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import { WalletProvider } from "@/lib/wallet/WalletProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Farmy Mini",
  description: "Chain of custody + price-cap escrow on a local Ganache chain (simulated assets).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WalletProvider>
          <header className="border-b border-black/10 dark:border-white/10">
            <nav className="mx-auto max-w-5xl flex items-center gap-6 p-4">
              <Link href="/" className="font-bold">🌾 Farmy Mini</Link>
              <Link href="/registry">Batches</Link>
              <Link href="/market">Market</Link>
              <div className="ml-auto"><WalletButton /></div>
            </nav>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
          <footer className="p-4 text-center text-xs opacity-60">Simulated assets on a local test chain. No real goods or payments.</footer>
        </WalletProvider>
      </body>
    </html>
  );
}

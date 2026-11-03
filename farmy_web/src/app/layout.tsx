import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import { ToastProvider } from "@/components/ui/Toast";
import { PeopleProvider } from "@/lib/people/PeopleProvider";
import { WalletProvider } from "@/lib/wallet/WalletProvider";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700", "800"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Farmy",
  description: "Follow farm batches from field to buyer and sell them at a capped price (simulated goods on a local test chain).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <WalletProvider>
          <PeopleProvider>
          <ToastProvider>
            <header className="border-b border-line bg-card">
              <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
                <Link href="/" className="font-display text-xl font-bold text-field">🌾 Farmy</Link>
                <Link href="/registry">Batches</Link>
                <Link href="/market">Market</Link>
                <Link href="/people">People</Link>
                <div className="ml-auto"><WalletButton /></div>
              </nav>
            </header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
            <footer className="px-4 py-6 text-center text-xs text-ink-soft">Simulated goods and money on a local test chain.</footer>
          </ToastProvider>
          </PeopleProvider>
        </WalletProvider>
      </body>
    </html>
  );
}

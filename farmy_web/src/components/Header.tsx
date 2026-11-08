"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { findPerson, shortAddress } from "@/lib/people";
import { usePeople } from "@/lib/people/PeopleProvider";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { Button } from "./ui/Button";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/registry", label: "Farm" },
  { href: "/market", label: "Market" },
  { href: "/guide", label: "Guide" },
  { href: "/people", label: "People" },
];

export function Header() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/registry" && pathname.startsWith("/batch")));

  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="whitespace-nowrap font-display text-2xl font-extrabold text-field">
          🌾 Farmy
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.href} {...n} active={isActive(n.href)} />
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <Identity />
          <details className="relative md:hidden">
            <summary className="flex h-10 cursor-pointer list-none items-center rounded-xl border border-line px-3 text-sm font-semibold">Menu</summary>
            <nav className="absolute right-0 z-40 mt-2 flex w-48 flex-col rounded-xl border border-line bg-card p-2 shadow-lg" aria-label="Main">
              {NAV.map((n) => (
                <NavLink key={n.href} {...n} active={isActive(n.href)} />
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-semibold ${active ? "text-field underline decoration-2 underline-offset-8" : "text-ink-soft hover:text-ink"}`}
    >
      {label}
    </Link>
  );
}

/** Who the app acts as: a Demo-mode person or the MetaMask account. */
function Identity() {
  const { mode, account, demoAvailable, hasMetaMask, isOnGanache, actAs, setMode, connect, switchToGanache } = useWallet();
  const { people } = usePeople();
  const menu = useRef<HTMLDetailsElement>(null);

  // First visit in Demo mode: start as the Farmer, who begins the story.
  useEffect(() => {
    if (mode === "demo" && !account && people[2]) actAs(people[2].address);
  }, [mode, account, people, actAs]);

  if (mode === "demo") {
    const me = findPerson(people, account);
    return (
      <details ref={menu} className="relative">
        <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-line bg-paper px-3 text-sm">
          <span className="hidden text-ink-soft sm:inline">Acting as</span>
          <span className="whitespace-nowrap font-semibold">{me ? `${me.emoji} ${me.name}` : "…"}</span>
          <span aria-hidden>▾</span>
        </summary>
        <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-line bg-card p-2 shadow-lg">
          {!demoAvailable && <p className="p-2 text-sm text-beet">Demo mode needs Ganache on 127.0.0.1:7545.</p>}
          {people.map((p) => (
            <button
              key={p.address}
              type="button"
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-field-wash ${p.address === account ? "font-bold text-field" : ""}`}
              onClick={() => {
                actAs(p.address);
                menu.current?.removeAttribute("open");
              }}
            >
              <span>
                {p.emoji} {p.name}
              </span>
              <span className="font-mono text-xs text-ink-soft">{shortAddress(p.address)}</span>
            </button>
          ))}
          {hasMetaMask && (
            <button type="button" className="mt-1 w-full rounded-lg border-t border-line px-3 py-2 text-left text-sm text-sky hover:bg-sky-wash" onClick={() => setMode("metamask")}>
              Use MetaMask instead
            </button>
          )}
        </div>
      </details>
    );
  }

  const demoLink = demoAvailable && (
    <Button size="sm" variant="ghost" onClick={() => setMode("demo")}>
      Use Demo mode
    </Button>
  );
  if (!hasMetaMask) return <>{demoLink}</>;
  if (!account) return <>{demoLink}<Button variant="primary" onClick={connect}>Connect MetaMask</Button></>;
  if (!isOnGanache) return <Button variant="danger" onClick={switchToGanache}>Switch MetaMask to Farmy</Button>;
  const me = findPerson(people, account);
  return (
    <>
      {demoLink}
      <span className="flex h-10 items-center rounded-xl border border-line px-3 text-sm font-semibold">
        🦊 {me ? `${me.emoji} ${me.name}` : shortAddress(account)}
      </span>
    </>
  );
}

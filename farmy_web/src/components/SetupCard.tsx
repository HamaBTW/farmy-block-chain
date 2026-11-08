"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GANACHE } from "@/lib/chain";
import { getContract, getDeployment, getReadProvider, type ContractName } from "@/lib/contracts";
import { usePeople } from "@/lib/people/PeopleProvider";
import { useChainVersion } from "@/lib/useChainVersion";
import { useWallet } from "@/lib/wallet/WalletProvider";

const CONTRACTS: { name: ContractName; label: string }[] = [
  { name: "BatchRegistry", label: "Batch registry" },
  { name: "FarmCoin", label: "FarmCoin (FRM)" },
  { name: "PriceCapEscrow", label: "Price-cap escrow" },
];

/** Is everything wired up? A single green line when it is, the list of what's missing when it isn't. */
export function SetupCard() {
  const { version } = useChainVersion();
  const { mode, account, isOnGanache } = useWallet();
  const { chainRoles } = usePeople();
  const [block, setBlock] = useState<number | null | "down">(null);
  const [linked, setLinked] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    getReadProvider()
      .getBlockNumber()
      .then((n) => live && setBlock(n))
      .catch(() => live && setBlock("down"));
    const registry = getContract("BatchRegistry");
    const escrow = getDeployment("PriceCapEscrow");
    registry
      ?.escrow()
      .then((a: string) => live && setLinked(!!escrow && a.toLowerCase() === escrow.address.toLowerCase()))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [version]);

  const checks = [
    { ok: typeof block === "number", label: `Ganache at ${GANACHE.rpcUrl}`, fix: "Start Ganache (network 5777, chain 1337)." },
    ...CONTRACTS.map((c) => ({ ok: !!getDeployment(c.name), label: `${c.label} deployed`, fix: "Run `npm run migrate` in farmy_blockchain." })),
    { ok: linked === true, label: "Escrow linked to the registry", fix: "The regulator links it in Farm → Regulator tools." },
    { ok: chainRoles.inspectors.length > 0, label: "At least one inspector", fix: "The regulator adds one in Farm → Regulator tools." },
    { ok: !!account && isOnGanache, label: mode === "demo" ? "Demo person chosen" : "MetaMask connected to Farmy", fix: "Choose who you are in the top right corner." },
  ];
  const missing = checks.filter((c) => !c.ok);

  return (
    <details className="rounded-2xl border border-line bg-card p-4" open={missing.length > 0}>
      <summary className="cursor-pointer font-semibold">
        {missing.length === 0 ? "✅ Everything is connected" : `⚠️ ${missing.length} setup step${missing.length > 1 ? "s" : ""} left`}
      </summary>
      <ul className="mt-3 space-y-2 text-sm">
        {checks.map((c) => (
          <li key={c.label} className="flex gap-2">
            <span aria-hidden>{c.ok ? "✅" : "⚪"}</span>
            <span>
              <span className="font-medium">{c.label}</span>
              {!c.ok && <span className="block text-ink-soft">{c.fix}</span>}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/guide#setup" className="mt-3 inline-block text-sm font-semibold text-sky underline">
        Setup guide
      </Link>
    </details>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BatchChips, assetDocOf } from "@/components/ui/BatchChips";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SetupCard } from "@/components/SetupCard";
import { Tag } from "@/components/ui/Tag";
import { assetLabel } from "@/lib/assetLabel";
import { getContract } from "@/lib/contracts";
import { formatFrm } from "@/lib/format";
import { canDo, nextSteps, STEP_PHRASES } from "@/lib/journey";
import { findPerson, ROLE_JOBS } from "@/lib/people";
import { hasChainRole, usePeople } from "@/lib/people/PeopleProvider";
import { useBatchViews } from "@/lib/useBatchViews";
import { useChainVersion } from "@/lib/useChainVersion";
import { useWallet } from "@/lib/wallet/WalletProvider";

/** Shared home: who you are, what you can do now, and the latest batches. */
export function HomeScreen() {
  const { version } = useChainVersion();
  const { batches } = useBatchViews(version);
  const { account } = useWallet();
  const { people, chainRoles } = usePeople();
  const me = findPerson(people, account);
  const balance = useBalance(account, version);
  const isInspector = hasChainRole(chainRoles, "inspector", account);

  const todo = batches
    .flatMap((b) => nextSteps(b).filter((s) => s.primary && canDo(s, account, isInspector)).map((s) => ({ b, s })))
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <section className="grid items-end gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">From farm to buyer, at a fair price.</h1>
          <p className="mt-4 max-w-prose text-lg text-ink-soft">
            Land and machines are NFTs. Every lot of produce is harvested from a land parcel and can be split so parts go to different places. Each
            hand-over and inspection stamps it, the price can only rise by a fixed markup, and the buyer&apos;s money waits in escrow until the goods arrive.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/guide" className="inline-flex h-10 items-center rounded-xl bg-field px-4 text-sm font-semibold text-field-ink">
              How it works
            </Link>
            <Link href="/registry" className="inline-flex h-10 items-center rounded-xl border border-line bg-card px-4 text-sm font-semibold">
              See the farm
            </Link>
          </div>
        </div>
        <Card className="space-y-2">
          <p className="text-sm text-ink-soft">You are</p>
          <p className="font-display text-3xl font-bold">{me ? `${me.emoji} ${me.name}` : "Nobody yet"}</p>
          <div className="flex flex-wrap gap-1">
            {hasChainRole(chainRoles, "regulator", account) && <Chip tone="sky">Regulator</Chip>}
            {hasChainRole(chainRoles, "authority", account) && <Chip tone="sky">Market authority</Chip>}
            {isInspector && <Chip tone="field">Inspector</Chip>}
          </div>
          <p className="text-sm text-ink-soft">{me ? ROLE_JOBS[me.role] : "Choose who you are in the top right corner."}</p>
          {balance !== null && (
            <p className="text-sm">
              Wallet: <b className="tabular">{formatFrm(balance)}</b>
            </p>
          )}
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Your next steps</h2>
          {todo.length === 0 ? (
            <p className="text-ink-soft">Nothing waits for you right now. Switch person in the top right corner to play another part.</p>
          ) : (
            <ul className="space-y-2">
              {todo.map(({ b, s }) => {
                const label = assetLabel(b.kind, assetDocOf(b.uri), b.quantity);
                return (
                  <li key={`${b.batchId}-${s.action}`}>
                    <Link href={`/batch/${b.batchId}`} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 hover:bg-field-wash">
                      <span className="text-2xl" aria-hidden>{label.emoji}</span>
                      <span>
                        <span className="font-semibold">{label.title} #{b.batchId.toString()}</span>
                        <span className="block text-sm text-ink-soft">Your turn to {STEP_PHRASES[s.action]}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <SetupCard />
        </div>
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Latest on the farm</h2>
          {batches.length === 0 ? (
            <p className="text-ink-soft">Nothing on the farm yet. The 🏛️ Regulator registers the first land on the Farm page.</p>
          ) : (
            <div className="space-y-4">
              {batches.slice(0, 3).map((b) => (
                <Link key={b.batchId.toString()} href={`/batch/${b.batchId}`} className="block rounded-lg">
                  <Tag batch={b} chips={<BatchChips batch={b} />} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function useBalance(account: string | null, version: number): bigint | null {
  const [balance, setBalance] = useState<bigint | null>(null);
  useEffect(() => {
    const coin = getContract("FarmCoin");
    if (!coin || !account) return;
    let live = true;
    coin.balanceOf(account).then((b: bigint) => live && setBalance(b)).catch(() => {});
    return () => {
      live = false;
    };
  }, [account, version]);
  return account ? balance : null;
}

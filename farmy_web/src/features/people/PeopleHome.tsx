"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "ethers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PersonName } from "@/components/ui/PersonName";
import { getContract } from "@/lib/contracts";
import { ROLE_JOBS, type Person } from "@/lib/people";
import { hasChainRole, usePeople } from "@/lib/people/PeopleProvider";
import { useChainVersion } from "@/lib/useChainVersion";
import { useWallet } from "@/lib/wallet/WalletProvider";

/** Shared screen: the demo cast with their roles, balances and editable names. */
export function PeopleHome() {
  const { people, loaded, chainRoles, reset } = usePeople();
  const balances = useBalances(people);
  const { account, mode, demoAvailable, actAs } = useWallet();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-prose">
          <h1 className="font-display text-3xl font-bold">People</h1>
          <p className="mt-1 text-ink-soft">
            The accounts of your local Ganache chain, each playing one part of the story. Rename them if you like: names are saved in
            this browser only.
          </p>
        </div>
        <Button size="sm" onClick={reset}>Reset names</Button>
      </div>

      {loaded && people.length === 0 && (
        <Card>
          <p>Ganache isn&apos;t answering, so there&apos;s nobody to show. Start Ganache on 127.0.0.1:7545 and reload.</p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((p) => (
          <Card key={p.address} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl" aria-hidden>{p.emoji}</span>
              <div className="flex flex-wrap justify-end gap-1">
                {hasChainRole(chainRoles, "regulator", p.address) && <Chip tone="sky">Regulator</Chip>}
                {hasChainRole(chainRoles, "authority", p.address) && <Chip tone="sky">Market authority</Chip>}
                {hasChainRole(chainRoles, "inspector", p.address) && <Chip tone="field">Inspector</Chip>}
              </div>
            </div>
            <RenameField person={p} />
            <p className="text-sm text-ink-soft">{ROLE_JOBS[p.role]}</p>
            <div className="flex items-center justify-between text-sm">
              <PersonName address={p.address} showAddress />
              <span className="font-semibold tabular">{balances[p.address] ?? "…"}</span>
            </div>
            {demoAvailable && (
              mode === "demo" && account?.toLowerCase() === p.address.toLowerCase() ? (
                <p className="text-sm font-semibold text-field">You are acting as {p.name}.</p>
              ) : (
                <Button size="sm" onClick={() => actAs(p.address)}>Act as {p.name}</Button>
              )
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function RenameField({ person }: { person: Person }) {
  const { rename } = usePeople();
  const [name, setName] = useState(person.name);
  const changed = name.trim() !== person.name;
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        rename(person.address, name);
      }}
    >
      <input className="input font-display text-base font-bold" value={name} onChange={(e) => setName(e.target.value)} aria-label={`Name of account ${person.index}`} />
      {changed && <Button size="md" type="submit">Save name</Button>}
    </form>
  );
}

function useBalances(people: Person[]): Record<string, string> {
  const { version } = useChainVersion();
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    const coin = getContract("FarmCoin");
    if (!coin || !people.length) return;
    let live = true;
    Promise.all(people.map((p) => coin.balanceOf(p.address) as Promise<bigint>))
      .then((values) => {
        if (live) setBalances(Object.fromEntries(people.map((p, i) => [p.address, `${formatUnits(values[i], 18)} FRM`])));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [people, version]);

  return balances;
}

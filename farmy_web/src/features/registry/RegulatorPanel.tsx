"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { PersonName } from "@/components/ui/PersonName";
import { TxButton } from "@/components/ui/TxButton";
import { getContract, getDeployment } from "@/lib/contracts";
import { hasChainRole, usePeople } from "@/lib/people/PeopleProvider";
import { mined } from "@/lib/tx";

/** Regulator (contract owner) tools: who may inspect, and which escrow may record sale prices. */
export function RegulatorPanel({ version, onDone }: { version: number; onDone: () => void }) {
  const { people, chainRoles } = usePeople();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold">🔍 Inspectors</h3>
        <p className="text-sm text-ink-soft">Inspectors add checkpoints and validate batches. Turn the role on or off per person.</p>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {people.map((p) => {
            const on = hasChainRole(chainRoles, "inspector", p.address);
            return (
              <li key={p.address} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="flex items-center gap-2">
                  <PersonName address={p.address} showAddress={false} />
                  {on && <Chip tone="field">Inspector</Chip>}
                </span>
                <TxButton
                  label={on ? "Remove inspector" : "Make inspector"}
                  done={on ? `${p.name} is no longer an inspector` : `${p.name} is now an inspector`}
                  variant={on ? "danger" : "secondary"}
                  send={(signed) => mined(signed("BatchRegistry").setInspector(p.address, !on))}
                  onDone={onDone}
                />
              </li>
            );
          })}
        </ul>
      </section>
      <EscrowLink version={version} onDone={onDone} />
    </div>
  );
}

function EscrowLink({ version, onDone }: { version: number; onDone: () => void }) {
  const [current, setCurrent] = useState<string | null>(null);
  const deployed = getDeployment("PriceCapEscrow")?.address ?? null;

  useEffect(() => {
    const registry = getContract("BatchRegistry");
    if (!registry) return;
    let live = true;
    registry.escrow().then((a: string) => live && setCurrent(a)).catch(() => {});
    return () => {
      live = false;
    };
  }, [version]);

  const linked = !!current && !!deployed && current.toLowerCase() === deployed.toLowerCase();
  return (
    <section className="space-y-3">
      <h3 className="font-display text-lg font-bold">💱 Market link</h3>
      <p className="text-sm text-ink-soft">Only the linked escrow may record a sale as the batch&apos;s new last price.</p>
      {linked ? (
        <Chip tone="field">Linked to the deployed escrow</Chip>
      ) : deployed ? (
        <TxButton label="Link the deployed escrow" done="Escrow linked" variant="primary" send={(signed) => mined(signed("BatchRegistry").setEscrow(deployed))} onDone={onDone} />
      ) : (
        <p className="text-sm text-harvest-ink">The escrow isn&apos;t deployed yet. Run `npm run migrate` in farmy_blockchain.</p>
      )}
      {current && !linked && <p className="font-mono text-xs text-ink-soft">Currently: {current}</p>}
    </section>
  );
}

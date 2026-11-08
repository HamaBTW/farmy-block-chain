"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { getContract } from "@/lib/contracts";
import type { AssetKind } from "@/lib/journey";
import { hasChainRole, usePeople } from "@/lib/people/PeopleProvider";
import { useBatchViews } from "@/lib/useBatchViews";
import { useChainVersion } from "@/lib/useChainVersion";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { BatchGrid } from "./BatchGrid";
import { RegisterAssetForm } from "./RegisterAssetForm";
import { RegulatorPanel } from "./RegulatorPanel";

const TABS: { kind: AssetKind; label: string; empty: string }[] = [
  { kind: "land", label: "🌍 Land", empty: "No land yet. The 🏛️ Regulator registers it." },
  { kind: "machine", label: "⚙️ Machines", empty: "No machines yet. The 🏛️ Regulator registers them." },
  { kind: "lot", label: "🫒 Lots", empty: "No lots yet. The holder of a land harvests one from the land's page." },
];

/** Person A: the farm's land, machines and lots, registering assets, and the regulator's tools. */
export function RegistryHome() {
  const { account, isOnGanache } = useWallet();
  const { chainRoles } = usePeople();
  const { version, reload } = useChainVersion();
  const { batches, loaded, error } = useBatchViews(version);
  const [tab, setTab] = useState<AssetKind>("land");
  const [registering, setRegistering] = useState(false);
  const [admin, setAdmin] = useState(false);
  const registry = getContract("BatchRegistry");
  const canWrite = !!account && isOnGanache;
  const isRegulator = hasChainRole(chainRoles, "regulator", account);

  if (!registry) {
    return (
      <Card>
        <h1 className="font-display text-3xl font-bold">Farm</h1>
        <p className="mt-2 text-ink-soft">The farm registry isn&apos;t deployed yet. Run `npm run migrate` in farmy_blockchain, then reload.</p>
      </Card>
    );
  }

  const current = TABS.find((t) => t.kind === tab)!;
  // Active assets first, split lots last.
  const shown = batches.filter((b) => b.kind === tab).sort((a, b) => Number(a.closed) - Number(b.closed));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-prose">
          <h1 className="font-display text-3xl font-bold">Farm</h1>
          <p className="mt-1 text-ink-soft">Land, machines and the lots harvested from the land. Open one to see its journey and what happens next.</p>
        </div>
        {isRegulator && (
          <div className="flex gap-2">
            <Button onClick={() => setAdmin(true)}>Regulator tools</Button>
            <Button variant="primary" disabled={!canWrite} onClick={() => setRegistering(true)}>
              Register land or machine
            </Button>
          </div>
        )}
      </div>

      <div role="tablist" aria-label="Kind of asset" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = batches.filter((b) => b.kind === t.kind && !b.closed).length;
          return (
            <button
              key={t.kind}
              type="button"
              role="tab"
              aria-selected={tab === t.kind}
              onClick={() => setTab(t.kind)}
              className={`h-10 rounded-full border px-4 text-sm font-semibold ${tab === t.kind ? "border-field bg-field text-field-ink" : "border-line bg-card hover:bg-field-wash"}`}
            >
              {t.label} · {count}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-beet">{error}</p>}
      {loaded && shown.length === 0 && (
        <Card className="text-center">
          <p className="text-ink-soft">{current.empty}</p>
        </Card>
      )}
      <BatchGrid batches={shown} />

      <Drawer open={registering} title="Register land or machine" onClose={() => setRegistering(false)}>
        {registering && <RegisterAssetForm />}
      </Drawer>
      <Drawer open={admin} title="Regulator tools" onClose={() => setAdmin(false)}>
        {admin && <RegulatorPanel version={version} onDone={reload} />}
      </Drawer>
    </div>
  );
}

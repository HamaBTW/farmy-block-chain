"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { getContract } from "@/lib/contracts";
import { hasChainRole, usePeople } from "@/lib/people/PeopleProvider";
import { useBatchViews } from "@/lib/useBatchViews";
import { useChainVersion } from "@/lib/useChainVersion";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { AddBatchForm } from "./AddBatchForm";
import { BatchGrid } from "./BatchGrid";
import { RegulatorPanel } from "./RegulatorPanel";

/** Person A: every batch as a tag, adding batches, and the regulator's tools. */
export function RegistryHome() {
  const { account, isOnGanache } = useWallet();
  const { chainRoles } = usePeople();
  const { version, reload } = useChainVersion();
  const { batches, loaded, error } = useBatchViews(version);
  const [adding, setAdding] = useState(false);
  const [admin, setAdmin] = useState(false);
  const registry = getContract("BatchRegistry");
  const canWrite = !!account && isOnGanache;
  const isRegulator = hasChainRole(chainRoles, "regulator", account);

  if (!registry) {
    return (
      <Card>
        <h1 className="font-display text-3xl font-bold">Batches</h1>
        <p className="mt-2 text-ink-soft">The batch registry isn&apos;t deployed yet. Run `npm run migrate` in farmy_blockchain, then reload.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-prose">
          <h1 className="font-display text-3xl font-bold">Batches</h1>
          <p className="mt-1 text-ink-soft">Every crate, lot or animal on its way from the farm. Open one to see its journey and what happens next.</p>
        </div>
        <div className="flex gap-2">
          {isRegulator && <Button onClick={() => setAdmin(true)}>Regulator tools</Button>}
          <Button variant="primary" disabled={!canWrite} onClick={() => setAdding(true)}>
            Add batch
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-beet">{error}</p>}
      {loaded && batches.length === 0 && (
        <Card className="text-center">
          <p className="font-display text-xl font-bold">No batches yet</p>
          <p className="mt-1 text-ink-soft">Add the first one as 🚜 Farmer.</p>
        </Card>
      )}
      <BatchGrid batches={batches} />

      <Drawer open={adding} title="Add a batch" onClose={() => setAdding(false)}>
        {adding && account && <AddBatchForm account={account} />}
      </Drawer>
      <Drawer open={admin} title="Regulator tools" onClose={() => setAdmin(false)}>
        {admin && <RegulatorPanel version={version} onDone={reload} />}
      </Drawer>
    </div>
  );
}

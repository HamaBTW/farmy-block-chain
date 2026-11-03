"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { BatchActions } from "./BatchActions";
import { BatchDetail } from "./BatchDetail";
import { BatchList } from "./BatchList";
import { MintBatchForm } from "./MintBatchForm";
import { RegulatorPanel } from "./RegulatorPanel";
import { useBatchDetail, useBatches, useRegistry, useReload, useRoles } from "./useRegistry";

/** Person A: BatchRegistry screens (batches, custody, checkpoints, validation). */
export function RegistryHome() {
  const registry = useRegistry();
  const { account, isOnGanache } = useWallet();
  const { version, reload } = useReload();
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const { batches, error, loaded } = useBatches(registry, version);
  const detail = useBatchDetail(registry, selectedId, version);
  const roles = useRoles(registry, account, version);

  const onMinted = useCallback(
    (batchId: bigint) => {
      setSelectedId(batchId);
      reload();
    },
    [reload],
  );

  if (!registry) {
    return (
      <div className="card">
        <h1 className="text-xl font-bold mb-2">Batches</h1>
        <p className="text-sm opacity-70">BatchRegistry is not deployed yet. Run `npm run migrate` in farmy_blockchain.</p>
      </div>
    );
  }

  const canWrite = !!account && isOnGanache;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold mr-2">Batches</h1>
        {roles.isOwner && <span className="pill">regulator</span>}
        {roles.isInspector && <span className="pill">inspector</span>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <section className="card">
            {!loaded ? <p className="text-sm opacity-60">Loading…</p> : <BatchList batches={batches} selectedId={selectedId} onSelect={setSelectedId} />}
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </section>
          <section className="card">
            {canWrite ? (
              <MintBatchForm key={account} account={account} onMinted={onMinted} />
            ) : (
              <p className="text-sm opacity-60">Connect MetaMask on the Farmy network to mint batches.</p>
            )}
          </section>
          {canWrite && (
            <section className="card">
              <RegulatorPanel registry={registry} isOwner={roles.isOwner} version={version} onDone={reload} />
            </section>
          )}
        </div>
        <section className="card">
          {detail.batch && detail.batch.id === selectedId ? (
            <>
              <BatchDetail batch={detail.batch} history={detail.history} />
              {canWrite && (
                <div className="mt-4">
                  <BatchActions key={`${detail.batch.id}-${account}`} batch={detail.batch} account={account} isInspector={roles.isInspector} onDone={reload} />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm opacity-60">{selectedId === null ? "Select a batch to see its history." : "Loading…"}</p>
          )}
          {detail.error && <p className="mt-2 text-sm text-red-500">{detail.error}</p>}
        </section>
      </div>
    </div>
  );
}

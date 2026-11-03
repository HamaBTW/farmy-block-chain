"use client";

import { getDeployment } from "@/lib/contracts";

/** Person A: BatchRegistry screens (mint, custody, checkpoints, validation) live in this folder. */
export function RegistryHome() {
  const deployment = getDeployment("BatchRegistry");
  return (
    <div className="card">
      <h1 className="text-xl font-bold mb-2">Batches</h1>
      <p className="text-sm opacity-70">
        {deployment ? `BatchRegistry at ${deployment.address}` : "BatchRegistry is not deployed yet. Run `npm run migrate` in farmy_blockchain."}
      </p>
    </div>
  );
}

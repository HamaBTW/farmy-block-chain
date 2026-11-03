"use client";

import { useState } from "react";
import { id as keccakText } from "ethers";
import { Field } from "./MintBatchForm";
import type { Batch } from "./registry";
import { useRegistryTx } from "./useRegistryTx";

type Props = {
  batch: Batch;
  account: string;
  isInspector: boolean;
  onDone: () => void;
};

/** Custody transfer (custodian) and inspector actions for one batch. The contract enforces the roles. */
export function BatchActions({ batch, account, isInspector, onDone }: Props) {
  const isCustodian = batch.custodian.toLowerCase() === account.toLowerCase();
  return (
    <div className="space-y-5 border-t border-black/10 dark:border-white/15 pt-4">
      <TransferCustody batchId={batch.id} isCustodian={isCustodian} onDone={onDone} />
      <AddCheckpoint batchId={batch.id} isInspector={isInspector} onDone={onDone} />
      {!batch.validated && <Validate batchId={batch.id} isInspector={isInspector} onDone={onDone} />}
    </div>
  );
}

function TransferCustody({ batchId, isCustodian, onDone }: { batchId: bigint; isCustodian: boolean; onDone: () => void }) {
  const [to, setTo] = useState("");
  const { send, pending, error } = useRegistryTx(onDone);
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        send((r) => r.transferCustody(batchId, to));
      }}
    >
      <h3 className="font-semibold">🚚 Transfer custody</h3>
      {!isCustodian && <RoleHint text="You are not the custodian: the contract will reject this." />}
      <Field label="Next custodian (transporter, warehouse, retailer, buyer)">
        <input className="input font-mono" value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x…" required />
      </Field>
      <button className="btn" disabled={pending}>{pending ? "Confirm in MetaMask…" : "Transfer"}</button>
      {error && <p className="text-sm text-red-500 break-all">{error}</p>}
    </form>
  );
}

function AddCheckpoint({ batchId, isInspector, onDone }: { batchId: bigint; isInspector: boolean; onDone: () => void }) {
  const [weight, setWeight] = useState("");
  const [temperature, setTemperature] = useState("");
  const [location, setLocation] = useState("");
  const [sent, setSent] = useState<{ record: string; hash: string } | null>(null);
  const { send, pending, error } = useRegistryTx(onDone);

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        // Only the hash goes on-chain; the record itself stays off-chain (rules: no big data on-chain).
        const record = JSON.stringify({ batchId: batchId.toString(), weightKg: weight, temperatureC: temperature, location, time: new Date().toISOString() });
        const hash = keccakText(record);
        setSent({ record, hash });
        send((r) => r.addCheckpoint(batchId, hash));
      }}
    >
      <h3 className="font-semibold">📋 Add checkpoint</h3>
      {!isInspector && <RoleHint text="You are not an inspector: the contract will reject this." />}
      <div className="grid grid-cols-3 gap-2">
        <Field label="Weight (kg)">
          <input className="input" value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" required />
        </Field>
        <Field label="Temp (°C)">
          <input className="input" value={temperature} onChange={(e) => setTemperature(e.target.value)} inputMode="decimal" required />
        </Field>
        <Field label="Location">
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} required />
        </Field>
      </div>
      <button className="btn" disabled={pending}>{pending ? "Confirm in MetaMask…" : "Add checkpoint"}</button>
      {error && <p className="text-sm text-red-500 break-all">{error}</p>}
      {sent && !error && (
        <p className="text-xs opacity-70 break-all">
          Off-chain record (keep it): <span className="font-mono">{sent.record}</span>
          <br />
          On-chain hash: <span className="font-mono">{sent.hash}</span>
        </p>
      )}
    </form>
  );
}

function Validate({ batchId, isInspector, onDone }: { batchId: bigint; isInspector: boolean; onDone: () => void }) {
  const { send, pending, error } = useRegistryTx(onDone);
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">✅ Validate batch</h3>
      {!isInspector && <RoleHint text="You are not an inspector: the contract will reject this." />}
      <button className="btn" disabled={pending} onClick={() => send((r) => r.validateBatch(batchId))}>
        {pending ? "Confirm in MetaMask…" : "Validate"}
      </button>
      {error && <p className="text-sm text-red-500 break-all">{error}</p>}
    </div>
  );
}

function RoleHint({ text }: { text: string }) {
  return <p className="text-xs text-amber-600">{text}</p>;
}

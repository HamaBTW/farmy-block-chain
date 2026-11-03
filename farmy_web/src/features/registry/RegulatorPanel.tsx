"use client";

import { useEffect, useState } from "react";
import { isAddress, type Contract } from "ethers";
import { Field } from "./MintBatchForm";
import { useRegistryTx } from "./useRegistryTx";

type Props = {
  registry: Contract;
  isOwner: boolean;
  version: number;
  onDone: () => void;
};

/** Regulator (contract owner) tools: manage inspectors and the authorized escrow. */
export function RegulatorPanel({ registry, isOwner, version, onDone }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="font-semibold">🏛️ Regulator</h2>
      {!isOwner && <p className="text-xs text-amber-600">You are not the regulator: the contract will reject these actions.</p>}
      <InspectorForm registry={registry} version={version} onDone={onDone} />
      <EscrowForm registry={registry} version={version} onDone={onDone} />
    </div>
  );
}

function InspectorForm({ registry, version, onDone }: Omit<Props, "isOwner">) {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState<boolean | null>(null);
  const { send, pending, error } = useRegistryTx(onDone);
  const valid = isAddress(account);

  useEffect(() => {
    if (!valid) return;
    let live = true;
    registry.isInspector(account).then((v: boolean) => live && setStatus(v)).catch(() => live && setStatus(null));
    return () => {
      live = false;
    };
  }, [registry, account, valid, version]);

  return (
    <div className="space-y-2">
      <Field label="Inspector address">
        <input className="input font-mono" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="0x…" />
      </Field>
      {valid && status !== null && <p className="text-xs opacity-70">Currently: {status ? "inspector ✓" : "not an inspector"}</p>}
      <div className="flex gap-2">
        <button className="btn" disabled={pending || !valid} onClick={() => send((r) => r.setInspector(account, true))}>
          Grant
        </button>
        <button className="btn btn-warn" disabled={pending || !valid} onClick={() => send((r) => r.setInspector(account, false))}>
          Revoke
        </button>
      </div>
      {error && <p className="text-sm text-red-500 break-all">{error}</p>}
    </div>
  );
}

function EscrowForm({ registry, version, onDone }: Omit<Props, "isOwner">) {
  const [current, setCurrent] = useState<string | null>(null);
  const [next, setNext] = useState("");
  const { send, pending, error } = useRegistryTx(onDone);

  useEffect(() => {
    let live = true;
    registry.escrow().then((a: string) => live && setCurrent(a)).catch(() => live && setCurrent(null));
    return () => {
      live = false;
    };
  }, [registry, version]);

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        send((r) => r.setEscrow(next));
      }}
    >
      <p className="text-sm">
        <span className="opacity-60">Escrow (only caller of recordSalePrice): </span>
        <span className="font-mono break-all">{current ?? "…"}</span>
      </p>
      <Field label="New escrow address (PriceCapEscrow)">
        <input className="input font-mono" value={next} onChange={(e) => setNext(e.target.value)} placeholder="0x…" required />
      </Field>
      <button className="btn" disabled={pending}>{pending ? "Confirm in MetaMask…" : "Set escrow"}</button>
      {error && <p className="text-sm text-red-500 break-all">{error}</p>}
    </form>
  );
}

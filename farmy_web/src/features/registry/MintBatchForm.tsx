"use client";

import { useCallback, useState } from "react";
import { parseUnits, type Contract, type TransactionReceipt } from "ethers";
import { useRegistryTx } from "./useRegistryTx";

type Props = {
  account: string;
  onMinted: (batchId: bigint) => void;
};

/** Mints a batch NFT. The farmer is usually the connected account. */
export function MintBatchForm({ account, onMinted }: Props) {
  const [to, setTo] = useState(account);
  const [uri, setUri] = useState("");
  const [price, setPrice] = useState("100");

  const onDone = useCallback(
    (receipt: TransactionReceipt, registry: Contract) => {
      for (const log of receipt.logs) {
        const parsed = registry.interface.parseLog(log);
        if (parsed?.name === "BatchMinted") return onMinted(parsed.args.batchId as bigint);
      }
    },
    [onMinted],
  );
  const { send, pending, error } = useRegistryTx(onDone);

  let priceWei: bigint | null = null;
  try {
    priceWei = parseUnits(price || "0", 18);
  } catch {
    priceWei = null;
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (priceWei) send((r) => r.mintBatch(to, uri, priceWei));
      }}
    >
      <h2 className="font-semibold">Mint a batch</h2>
      <Field label="First custodian (farmer)">
        <input className="input font-mono" value={to} onChange={(e) => setTo(e.target.value)} required />
      </Field>
      <Field label="Metadata URI or hash (off-chain: type, origin, quantity)">
        <input className="input" value={uri} onChange={(e) => setUri(e.target.value)} placeholder="ipfs://… (simulated)" required />
      </Field>
      <Field label="Initial price (FRM)">
        <input className="input font-mono" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" required />
      </Field>
      <button className="btn" disabled={pending || !priceWei}>{pending ? "Confirm in MetaMask…" : "Mint batch"}</button>
      {error && <p className="text-sm text-red-500 break-all">{error}</p>}
    </form>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 opacity-70">{label}</span>
      {children}
    </label>
  );
}

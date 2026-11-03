"use client";

import { useEffect, useState } from "react";
import { parseUnits } from "ethers";
import { mined, useContractTx } from "@/lib/tx";
import { priceCap } from "./sales";
import { formatFrm, type MarketContracts } from "./useMarket";

type Props = { market: MarketContracts; account: string; markup: number; version: number; onDone: () => void };

type BatchInfo = { lastPrice: bigint; custodian: string } | { missing: true };

/** Lists a batch for sale. Shows the cap first; the escrow contract is what enforces it. */
export function CreateSaleForm({ market, account, markup, version, onDone }: Props) {
  const [batchId, setBatchId] = useState("1");
  const [price, setPrice] = useState("");
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const { run, pending, error } = useContractTx();

  const id = /^\d+$/.test(batchId) && batchId !== "0" ? BigInt(batchId) : null;

  useEffect(() => {
    if (id === null) return;
    let live = true;
    Promise.all([market.registry.getLastPrice(id), market.registry.custodianOf(id)])
      .then(([lastPrice, custodian]: [bigint, string]) => live && setBatch({ lastPrice, custodian }))
      .catch(() => live && setBatch({ missing: true }));
    return () => {
      live = false;
    };
  }, [market, id, version]);

  let priceWei: bigint | null = null;
  try {
    priceWei = price ? parseUnits(price, 18) : null;
  } catch {
    priceWei = null;
  }

  const info = id !== null && batch && !("missing" in batch) ? batch : null;
  const cap = info ? priceCap(info.lastPrice, markup) : null;
  const overCap = cap !== null && priceWei !== null && priceWei > cap;
  const notCustodian = info !== null && info.custodian.toLowerCase() !== account.toLowerCase();

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (id === null || !priceWei) return;
        run(async (signed) => {
          await mined(signed("PriceCapEscrow").createSale(id, priceWei));
          setPrice("");
          onDone();
        });
      }}
    >
      <h2 className="font-semibold">🏷️ Sell a batch</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          <span className="block mb-1 opacity-70">Batch #</span>
          <input className="input font-mono" value={batchId} onChange={(e) => setBatchId(e.target.value)} inputMode="numeric" required />
        </label>
        <label className="block text-sm">
          <span className="block mb-1 opacity-70">Price (FRM)</span>
          <input className="input font-mono" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" required />
        </label>
      </div>
      {id !== null && batch && "missing" in batch && <p className="text-xs text-amber-600">Batch #{batchId} doesn&apos;t exist.</p>}
      {info && cap !== null && (
        <p className="text-xs opacity-80" data-testid="cap-info">
          Last price {formatFrm(info.lastPrice)} · max markup {markup}% → <b>cap {formatFrm(cap)}</b>
        </p>
      )}
      {overCap && <p className="text-xs text-amber-600">Above the cap: the escrow contract will reject this price.</p>}
      {notCustodian && <p className="text-xs text-amber-600">You are not the custodian of this batch: the escrow will reject the listing.</p>}
      <button className="btn" disabled={pending || id === null || !priceWei}>{pending ? "Confirm in MetaMask…" : "List for sale"}</button>
      {error && <p className="text-sm text-red-500 break-all">{error}</p>}
    </form>
  );
}

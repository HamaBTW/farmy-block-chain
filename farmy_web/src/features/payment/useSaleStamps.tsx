"use client";

import { useEffect, useState } from "react";
import type { Contract, EventLog } from "ethers";
import { PersonName } from "@/components/ui/PersonName";
import type { StampItem } from "@/components/ui/Stamp";
import { getContract } from "@/lib/contracts";
import { formatFrm } from "@/lib/format";

/** Person B: the escrow events of one batch (listed, paid, released, refunded) as journey stamps. */
export function useSaleStamps(batchId: bigint, version: number): StampItem[] {
  const [stamps, setStamps] = useState<StampItem[]>([]);

  useEffect(() => {
    const escrow = getContract("PriceCapEscrow");
    if (!escrow) return;
    let live = true;
    loadSaleStamps(escrow, batchId)
      .then((items) => live && setStamps(items))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [batchId, version]);

  return stamps;
}

async function loadSaleStamps(escrow: Contract, batchId: bigint): Promise<StampItem[]> {
  const created = (await escrow.queryFilter(escrow.filters.SaleCreated(null, batchId))) as EventLog[];
  if (created.length === 0) return [];
  const ids = created.map((l) => l.args.saleId as bigint);
  const [deposited, released, refunded] = await Promise.all(
    ["Deposited", "PaymentReleased", "Refunded"].map((name) => escrow.queryFilter(escrow.filters[name](ids)) as Promise<EventLog[]>),
  );
  const logs = [...created, ...deposited, ...released, ...refunded];

  const times = new Map<number, number>();
  await Promise.all(
    [...new Set(logs.map((l) => l.blockNumber))].map(async (n) => times.set(n, (await escrow.runner!.provider!.getBlock(n))?.timestamp ?? 0)),
  );

  return logs.map((l): StampItem => {
    const base = { key: `s-${l.blockNumber}-${l.index}`, blockNumber: l.blockNumber, logIndex: l.index, timestamp: times.get(l.blockNumber) ?? 0 };
    const a = l.args;
    switch (l.eventName) {
      case "SaleCreated":
        return { ...base, emoji: "🏷️", tone: "harvest", title: `Listed at ${formatFrm(a.price)}`, detail: <>by <PersonName address={a.seller} showAddress={false} /> (sale #{a.saleId.toString()})</> };
      case "Deposited":
        return { ...base, emoji: "🔒", tone: "harvest", title: `${formatFrm(a.price)} paid into escrow`, detail: <>by <PersonName address={a.buyer} showAddress={false} /></> };
      case "PaymentReleased":
        return { ...base, emoji: "💸", tone: "field", title: "Payment released", detail: <>{formatFrm(a.price)} to <PersonName address={a.seller} showAddress={false} /></> };
      default:
        return (a.amount as bigint) > BigInt(0)
          ? { ...base, emoji: "↩️", tone: "beet", title: `Refunded ${formatFrm(a.amount)}`, detail: <>to <PersonName address={a.buyer} showAddress={false} /></> }
          : { ...base, emoji: "↩️", tone: "beet", title: "Listing cancelled" };
    }
  });
}

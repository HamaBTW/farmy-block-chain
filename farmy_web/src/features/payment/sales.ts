import type { Contract, EventLog } from "ethers";
import type { MarketContracts } from "./useMarket";

export const SALE_STATES = ["None", "Created", "Deposited", "Released", "Refunded"] as const;
export type SaleStateName = (typeof SALE_STATES)[number];

export type Sale = {
  id: bigint;
  batchId: bigint;
  seller: string;
  buyer: string;
  price: bigint;
  state: SaleStateName;
  /** Registry state, only loaded for open sales (release conditions). */
  validated?: boolean;
  custodian?: string;
};

/** All sales, newest first. Ids come from SaleCreated events, live state from getSale. */
export async function loadSales({ escrow, registry }: MarketContracts): Promise<Sale[]> {
  const logs = await escrow.queryFilter(escrow.filters.SaleCreated());
  const ids = logs.map((log) => (log as EventLog).args.saleId as bigint).reverse();
  return Promise.all(ids.map((id) => loadSale(escrow, registry, id)));
}

async function loadSale(escrow: Contract, registry: Contract, id: bigint): Promise<Sale> {
  const s = await escrow.getSale(id);
  const sale: Sale = {
    id,
    batchId: s.batchId as bigint,
    seller: s.seller as string,
    buyer: s.buyer as string,
    price: s.price as bigint,
    state: SALE_STATES[Number(s.state)],
  };
  if (sale.state === "Created" || sale.state === "Deposited") {
    const [validated, custodian] = await Promise.all([registry.isValidated(sale.batchId), registry.custodianOf(sale.batchId)]);
    sale.validated = validated;
    sale.custodian = custodian;
  }
  return sale;
}

/** Mirrors PriceCapEscrow's rule: price <= lastPrice * (100 + markup) / 100 (rounded down). */
export function priceCap(lastPrice: bigint, markupPercent: number): bigint {
  return (lastPrice * BigInt(100 + markupPercent)) / BigInt(100);
}

import type { Contract, EventLog } from "ethers";
import type { JourneyState, OpenSale } from "./journey";

const OPEN_STATES: Record<number, OpenSale["state"]> = { 1: "Created", 2: "Deposited" };

/** Live state of one batch and its open sale (escrow may be null if not deployed yet). */
export async function loadJourneyState(registry: Contract, escrow: Contract | null, batchId: bigint): Promise<JourneyState> {
  const [custodian, validated, lastPrice, saleId] = await Promise.all([
    registry.custodianOf(batchId) as Promise<string>,
    registry.isValidated(batchId) as Promise<boolean>,
    registry.getLastPrice(batchId) as Promise<bigint>,
    escrow ? (escrow.openSaleOf(batchId) as Promise<bigint>) : Promise.resolve(BigInt(0)),
  ]);
  let sale: OpenSale | null = null;
  if (escrow && saleId !== BigInt(0)) {
    const s = await escrow.getSale(saleId);
    const state = OPEN_STATES[Number(s.state)];
    if (state) sale = { id: saleId, seller: s.seller, buyer: s.buyer, price: s.price, state };
  }
  return { batchId, custodian, validated, lastPrice, sale };
}

/** Ids of every batch, newest first (the registry isn't enumerable, so they come from BatchMinted events). */
export async function loadBatchIds(registry: Contract): Promise<bigint[]> {
  const logs = await registry.queryFilter(registry.filters.BatchMinted());
  return logs.map((log) => (log as EventLog).args.batchId as bigint).reverse();
}

export async function loadAllJourneyStates(registry: Contract, escrow: Contract | null): Promise<JourneyState[]> {
  const ids = await loadBatchIds(registry);
  return Promise.all(ids.map((id) => loadJourneyState(registry, escrow, id)));
}

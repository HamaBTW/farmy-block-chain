import type { Contract, EventLog } from "ethers";
import type { AssetKind, JourneyState, OpenSale, Step } from "./journey";

/** Same order as BatchRegistry.Kind. */
export const KINDS: AssetKind[] = ["land", "machine", "lot"];

/** An asset as screens show it: its journey state, metadata URI and lot links. */
export type BatchView = JourneyState & { uri: string; landId: bigint; parentId: bigint; quantity: bigint };

type AssetInfo = { kind: AssetKind; landId: bigint; parentId: bigint; quantity: bigint; closed: boolean };

const OPEN_STATES: Record<number, OpenSale["state"]> = { 1: "Created", 2: "Deposited" };

async function loadAssetInfo(registry: Contract, id: bigint): Promise<AssetInfo> {
  const i = await registry.assetInfo(id);
  return { kind: KINDS[Number(i.kind)], landId: i.landId, parentId: i.parentId, quantity: i.quantity, closed: i.closed };
}

/** Live state of one asset and its open sale (escrow may be null if not deployed yet). */
export async function loadJourneyState(registry: Contract, escrow: Contract | null, batchId: bigint): Promise<JourneyState> {
  const [custodian, validated, lastPrice, saleId, info] = await Promise.all([
    registry.custodianOf(batchId) as Promise<string>,
    registry.isValidated(batchId) as Promise<boolean>,
    registry.getLastPrice(batchId) as Promise<bigint>,
    escrow ? (escrow.openSaleOf(batchId) as Promise<bigint>) : Promise.resolve(BigInt(0)),
    loadAssetInfo(registry, batchId),
  ]);
  let sale: OpenSale | null = null;
  if (escrow && saleId !== BigInt(0)) {
    const s = await escrow.getSale(saleId);
    const state = OPEN_STATES[Number(s.state)];
    if (state) sale = { id: saleId, seller: s.seller, buyer: s.buyer, price: s.price, state };
  }
  return { batchId, kind: info.kind, closed: info.closed, custodian, validated, lastPrice, sale };
}

/** Ids of every asset, newest first (the registry isn't enumerable; every new token emits AssetRegistered). */
export async function loadBatchIds(registry: Contract): Promise<bigint[]> {
  const logs = await registry.queryFilter(registry.filters.AssetRegistered());
  return logs.map((log) => (log as EventLog).args.batchId as bigint).reverse();
}

export async function loadBatchView(registry: Contract, escrow: Contract | null, batchId: bigint): Promise<BatchView> {
  const [state, uri, info] = await Promise.all([
    loadJourneyState(registry, escrow, batchId),
    registry.tokenURI(batchId) as Promise<string>,
    loadAssetInfo(registry, batchId),
  ]);
  return { ...state, uri, landId: info.landId, parentId: info.parentId, quantity: info.quantity };
}

export async function loadAllBatchViews(registry: Contract, escrow: Contract | null): Promise<BatchView[]> {
  const ids = await loadBatchIds(registry);
  return Promise.all(ids.map((id) => loadBatchView(registry, escrow, id)));
}

/** Lots a lot was split into, in split order. */
export async function loadChildren(registry: Contract, lotId: bigint): Promise<bigint[]> {
  const logs = await registry.queryFilter(registry.filters.LotSplit(lotId));
  return logs.map((log) => (log as EventLog).args.childId as bigint);
}

/** Lots harvested from a land parcel, oldest first. */
export async function loadHarvests(registry: Contract, landId: bigint): Promise<bigint[]> {
  const logs = await registry.queryFilter(registry.filters.LotHarvested(null, landId));
  return logs.map((log) => (log as EventLog).args.batchId as bigint);
}

/** What the journey page hands to the market panel (B) so it can render the sale steps of this asset. */
export type SaleContext = { batch: BatchView; steps: Step[]; me: string; onDone: () => void };

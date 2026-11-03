import { formatUnits, type Contract, type EventLog, type Log } from "ethers";

export type Batch = {
  id: bigint;
  custodian: string;
  validated: boolean;
  lastPrice: bigint;
  uri: string;
};

export type HistoryKind = "BatchMinted" | "CustodyTransferred" | "CheckpointAdded" | "BatchValidated" | "PriceRecorded";

export type HistoryItem = {
  kind: HistoryKind;
  blockNumber: number;
  logIndex: number;
  txHash: string;
  timestamp: number;
  args: Record<string, string>;
};

const HISTORY_EVENTS: HistoryKind[] = ["BatchMinted", "CustodyTransferred", "CheckpointAdded", "BatchValidated", "PriceRecorded"];

export async function loadBatch(registry: Contract, id: bigint): Promise<Batch> {
  const [custodian, validated, lastPrice, uri] = await Promise.all([
    registry.custodianOf(id),
    registry.isValidated(id),
    registry.getLastPrice(id),
    registry.tokenURI(id),
  ]);
  return { id, custodian, validated, lastPrice, uri };
}

/** All batches, newest first. The contract isn't enumerable, so ids come from BatchMinted events. */
export async function loadBatches(registry: Contract): Promise<Batch[]> {
  const logs = await registry.queryFilter(registry.filters.BatchMinted());
  const ids = logs.map((log) => (log as EventLog).args.batchId as bigint).reverse();
  return Promise.all(ids.map((id) => loadBatch(registry, id)));
}

/** Every registry event for one batch, oldest first. History lives in events, not storage. */
export async function loadHistory(registry: Contract, id: bigint): Promise<HistoryItem[]> {
  const perEvent = await Promise.all(HISTORY_EVENTS.map((name) => registry.queryFilter(registry.filters[name](id))));
  const logs = perEvent.flat() as EventLog[];
  logs.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);

  const timestamps = new Map<number, number>();
  await Promise.all(
    [...new Set(logs.map((l) => l.blockNumber))].map(async (n) => {
      const block = await registry.runner!.provider!.getBlock(n);
      timestamps.set(n, block?.timestamp ?? 0);
    }),
  );

  return logs.map((log) => ({
    kind: log.eventName as HistoryKind,
    blockNumber: log.blockNumber,
    logIndex: log.index,
    txHash: log.transactionHash,
    timestamp: timestamps.get(log.blockNumber) ?? 0,
    args: argsOf(log),
  }));
}

function argsOf(log: EventLog | Log): Record<string, string> {
  if (!("fragment" in log)) return {};
  const out: Record<string, string> = {};
  log.fragment.inputs.forEach((input, i) => {
    if (input.name !== "batchId") out[input.name] = String(log.args[i]);
  });
  return out;
}

export function formatFrm(value: bigint | string): string {
  return `${formatUnits(value, 18)} FRM`;
}

import type { Contract, EventLog, Log } from "ethers";

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

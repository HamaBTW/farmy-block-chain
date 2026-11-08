import type { Contract, EventLog, Log } from "ethers";

export type HistoryKind = "AssetRegistered" | "LotHarvested" | "LotSplit" | "CustodyTransferred" | "CheckpointAdded" | "BatchValidated" | "PriceRecorded";

export type HistoryItem = {
  kind: HistoryKind;
  blockNumber: number;
  logIndex: number;
  txHash: string;
  timestamp: number;
  /** Every event argument as a string, including `batchId`. */
  args: Record<string, string>;
};

/** Every registry event about one asset, oldest first: its own events plus harvests from it (land) and splits into/out of it (lots). */
export async function loadHistory(registry: Contract, id: bigint): Promise<HistoryItem[]> {
  const f = registry.filters;
  const filters = [
    f.AssetRegistered(id),
    f.LotHarvested(id),
    f.LotHarvested(null, id),
    f.LotSplit(id),
    f.LotSplit(null, id),
    f.CustodyTransferred(id),
    f.CheckpointAdded(id),
    f.BatchValidated(id),
    f.PriceRecorded(id),
  ];
  const perFilter = await Promise.all(filters.map((filter) => registry.queryFilter(filter)));
  const seen = new Set<string>();
  const logs = (perFilter.flat() as EventLog[]).filter((l) => {
    const key = `${l.transactionHash}-${l.index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    out[input.name] = String(log.args[i]);
  });
  return out;
}

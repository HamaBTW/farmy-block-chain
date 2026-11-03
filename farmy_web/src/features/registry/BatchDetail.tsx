"use client";

import { ValidatedBadge } from "./BatchList";
import { formatFrm, type Batch, type HistoryItem } from "./registry";

export function BatchDetail({ batch, history }: { batch: Batch; history: HistoryItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Batch #{batch.id.toString()}</h2>
        <ValidatedBadge validated={batch.validated} />
      </div>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
        <dt className="opacity-60">Custodian</dt>
        <dd className="font-mono break-all">{batch.custodian}</dd>
        <dt className="opacity-60">Last price</dt>
        <dd className="font-mono">{formatFrm(batch.lastPrice)}</dd>
        <dt className="opacity-60">Metadata</dt>
        <dd className="font-mono break-all">{batch.uri || "—"}</dd>
      </dl>

      <div>
        <h3 className="font-semibold mb-2">History</h3>
        <ol className="space-y-2 text-sm border-l border-black/10 dark:border-white/15 pl-4">
          {history.map((item) => (
            <li key={`${item.blockNumber}-${item.logIndex}`}>
              <div className="font-medium">{LABELS[item.kind]}</div>
              <div className="font-mono text-xs opacity-70 break-all">{describe(item)}</div>
              <div className="text-xs opacity-50">
                block #{item.blockNumber} · {new Date(item.timestamp * 1000).toLocaleString()}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const LABELS: Record<HistoryItem["kind"], string> = {
  BatchMinted: "🌱 Minted",
  CustodyTransferred: "🚚 Custody transferred",
  CheckpointAdded: "📋 Checkpoint",
  BatchValidated: "✅ Validated",
  PriceRecorded: "💰 Price recorded",
};

function describe({ kind, args }: HistoryItem): string {
  switch (kind) {
    case "BatchMinted":
      return `farmer ${args.farmer}`;
    case "CustodyTransferred":
      return `${args.from} → ${args.to}`;
    case "CheckpointAdded":
      return `inspector ${args.inspector} · data ${args.dataHash}`;
    case "BatchValidated":
      return `inspector ${args.inspector}`;
    case "PriceRecorded":
      return formatFrm(args.price);
  }
}

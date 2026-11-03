"use client";

import { shortAddress } from "@/lib/chain";
import { formatFrm, type Batch } from "./registry";

type Props = {
  batches: Batch[];
  selectedId: bigint | null;
  onSelect: (id: bigint) => void;
};

export function BatchList({ batches, selectedId, onSelect }: Props) {
  if (batches.length === 0) return <p className="text-sm opacity-60">No batches yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left opacity-60">
        <tr>
          <th className="py-1">#</th>
          <th>Custodian</th>
          <th>Status</th>
          <th className="text-right">Last price</th>
        </tr>
      </thead>
      <tbody>
        {batches.map((b) => (
          <tr
            key={b.id.toString()}
            onClick={() => onSelect(b.id)}
            className={`cursor-pointer border-t border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 ${
              b.id === selectedId ? "bg-green-700/10" : ""
            }`}
          >
            <td className="py-2 font-mono">{b.id.toString()}</td>
            <td className="font-mono">{shortAddress(b.custodian)}</td>
            <td><ValidatedBadge validated={b.validated} /></td>
            <td className="text-right font-mono">{formatFrm(b.lastPrice)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ValidatedBadge({ validated }: { validated: boolean }) {
  return validated ? (
    <span className="pill border-green-600 text-green-700 dark:text-green-400">✓ validated</span>
  ) : (
    <span className="pill opacity-70">not validated</span>
  );
}

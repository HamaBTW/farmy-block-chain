"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TxButton } from "@/components/ui/TxButton";
import { formatFrm } from "@/lib/format";
import type { BatchView } from "@/lib/journeyData";
import { checkSplit, MAX_PARTS, splitPrices } from "@/lib/split";
import { mined } from "@/lib/tx";

/** Lot holder: splits the lot into smaller lots that can go to different places. Shows each part's price before signing. */
export function SplitForm({ lot, onDone }: { lot: BatchView; onDone: () => void }) {
  const half = lot.quantity / BigInt(2);
  const [parts, setParts] = useState<string[]>(() => [half.toString(), (lot.quantity - half).toString()]);
  const nums = parts.map((p) => (/^\d+$/.test(p.trim()) ? BigInt(p.trim()) : BigInt(0)));
  const sizeProblem = checkSplit(lot.quantity, nums);
  const prices = sizeProblem ? [] : splitPrices(lot.lastPrice, nums);
  // The contract rejects a free part (ZeroPrice), so catch it before signing.
  const problem = sizeProblem ?? (prices.some((p) => p === BigInt(0)) ? "One part would cost 0 FRM. Make the parts bigger." : null);

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        This lot has {lot.quantity.toString()} units. Each part becomes its own lot with its share of the price, and this lot closes.
      </p>
      <ul className="space-y-2">
        {parts.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              className="input tabular"
              inputMode="numeric"
              aria-label={`Part ${i + 1}`}
              value={p}
              onChange={(e) => setParts(parts.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <span className="w-28 shrink-0 text-right text-sm tabular">{prices[i] !== undefined ? formatFrm(prices[i]) : "…"}</span>
            {parts.length > 2 && (
              <Button size="sm" variant="ghost" onClick={() => setParts(parts.filter((_, j) => j !== i))}>
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
      {parts.length < MAX_PARTS && (
        <Button size="sm" onClick={() => setParts([...parts, "0"])}>
          Add a part
        </Button>
      )}
      {problem && <p className="text-sm text-harvest-ink">{problem}</p>}
      <TxButton label="Split lot" done="Lot split" variant="primary" disabled={!!problem} send={(signed) => mined(signed("BatchRegistry").splitLot(lot.batchId, nums))} onDone={onDone} />
    </div>
  );
}

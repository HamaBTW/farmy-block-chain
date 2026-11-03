"use client";

import { shortAddress } from "@/lib/chain";
import type { Sale } from "./sales";
import { formatFrm } from "./useMarket";

const ZERO = "0x0000000000000000000000000000000000000000";

const STATE_STYLE: Record<Sale["state"], string> = {
  None: "opacity-60",
  Created: "border-sky-600 text-sky-700 dark:text-sky-400",
  Deposited: "border-amber-600 text-amber-700 dark:text-amber-400",
  Released: "border-green-600 text-green-700 dark:text-green-400",
  Refunded: "opacity-60",
};

type Props = { sales: Sale[]; renderActions?: (sale: Sale) => React.ReactNode };

export function SalesList({ sales, renderActions }: Props) {
  if (sales.length === 0) return <p className="text-sm opacity-60">No sales yet.</p>;
  return (
    <div className="space-y-3">
      {sales.map((sale) => (
        <div key={sale.id.toString()} className="rounded-lg border border-black/10 dark:border-white/15 p-3 text-sm space-y-1" data-testid={`sale-${sale.id}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Sale #{sale.id.toString()}</span>
            <span className="opacity-60">batch #{sale.batchId.toString()}</span>
            <span className={`pill ${STATE_STYLE[sale.state]}`}>{sale.state}</span>
            <span className="ml-auto font-mono font-semibold">{formatFrm(sale.price)}</span>
          </div>
          <div className="font-mono text-xs opacity-70">
            seller {shortAddress(sale.seller)}
            {sale.buyer !== ZERO && <> · buyer {shortAddress(sale.buyer)}</>}
          </div>
          {renderActions?.(sale)}
        </div>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Chip, type Tone } from "@/components/ui/Chip";
import { PersonName } from "@/components/ui/PersonName";
import { formatFrm } from "@/lib/format";
import type { AssetLabel } from "@/lib/assetLabel";
import type { Sale } from "./sales";

const ZERO = "0x0000000000000000000000000000000000000000";

const STATE: Record<Sale["state"], { label: string; tone: Tone }> = {
  None: { label: "Unknown", tone: "plain" },
  Created: { label: "🏷️ For sale", tone: "harvest" },
  Deposited: { label: "🔒 Paid into escrow", tone: "harvest" },
  Released: { label: "💸 Payment released", tone: "field" },
  Refunded: { label: "↩️ Refunded", tone: "beet" },
};

type Props = { sales: Sale[]; labels: Map<string, AssetLabel>; empty: string };

/** Sales as rows; the action for each happens on its batch page. */
export function SalesList({ sales, labels, empty }: Props) {
  if (sales.length === 0) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {sales.map((sale) => {
        const label = labels.get(sale.batchId.toString());
        const state = STATE[sale.state];
        return (
          <li key={sale.id.toString()} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <span className="text-2xl" aria-hidden>
              {label?.emoji ?? "📦"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {label ? label.title : "Asset"} <span className="text-sm font-normal text-ink-soft">#{sale.batchId.toString()}</span>
                <span className="ml-2 text-sm font-normal text-ink-soft">sale #{sale.id.toString()}</span>
              </p>
              <p className="text-sm text-ink-soft">
                Seller <PersonName address={sale.seller} showAddress={false} />
                {sale.buyer !== ZERO && (
                  <>
                    {" "}· buyer <PersonName address={sale.buyer} showAddress={false} />
                  </>
                )}
              </p>
            </div>
            <Chip tone={state.tone}>{state.label}</Chip>
            <span className="w-24 text-right font-display text-xl font-bold tabular">{formatFrm(sale.price)}</span>
            <Link href={`/batch/${sale.batchId}`} className="rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:bg-field-wash">
              Open
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

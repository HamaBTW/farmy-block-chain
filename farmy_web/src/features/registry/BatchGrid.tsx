"use client";

import Link from "next/link";
import { BatchChips, batchDocOf } from "@/components/ui/BatchChips";
import { Tag } from "@/components/ui/Tag";
import type { BatchView } from "@/lib/journeyData";

/** Every batch as a tag; each opens its journey. */
export function BatchGrid({ batches }: { batches: BatchView[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {batches.map((b) => (
        <Link key={b.batchId.toString()} href={`/batch/${b.batchId}`} className="block rounded-lg focus-visible:outline-offset-4">
          <Tag batchId={b.batchId} doc={batchDocOf(b.uri)} price={b.lastPrice} holder={b.custodian} chips={<BatchChips batch={b} />} />
        </Link>
      ))}
    </div>
  );
}

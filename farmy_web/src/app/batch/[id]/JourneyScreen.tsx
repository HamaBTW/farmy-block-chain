"use client";

import { useParams } from "next/navigation";
import { BatchJourney } from "@/features/registry/BatchJourney";
import { SalePanel } from "@/features/payment/SalePanel";
import { useSaleStamps } from "@/features/payment/useSaleStamps";
import { useChainVersion } from "@/lib/useChainVersion";

/** Shared: puts A's journey and B's market panel together, so neither feature imports the other. */
export function JourneyScreen() {
  const { id } = useParams<{ id: string }>();
  const batchId = /^\d+$/.test(id) ? BigInt(id) : BigInt(0);
  const { version, reload } = useChainVersion();
  const saleStamps = useSaleStamps(batchId, version);
  return <BatchJourney batchId={batchId} version={version} reload={reload} saleStamps={saleStamps} salePanel={(ctx) => <SalePanel {...ctx} />} />;
}

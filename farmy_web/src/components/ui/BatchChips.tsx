import { getDoc } from "@/lib/docStore";
import type { BatchView } from "@/lib/journeyData";
import { hashFromUri, isAssetDoc, type AssetDoc } from "@/lib/metadata";
import { Chip } from "./Chip";

/** Validation, sale and split chips for an asset, in the status colors of DESIGN_SYSTEM.md §2. */
export function BatchChips({ batch }: { batch: BatchView }) {
  if (batch.closed) return <Chip tone="plain">✂️ Split</Chip>;
  return (
    <>
      {batch.validated ? <Chip tone="field">✅ Validated</Chip> : <Chip tone="plain">Not validated</Chip>}
      {batch.sale?.state === "Created" && <Chip tone="harvest">🏷️ For sale</Chip>}
      {batch.sale?.state === "Deposited" && <Chip tone="harvest">🔒 Paid into escrow</Chip>}
    </>
  );
}

/** The off-chain description of an asset (land, machine or lot), when this browser has it. */
export function assetDocOf(uri: string): AssetDoc | null {
  const hash = hashFromUri(uri);
  const doc = hash ? getDoc(hash) : null;
  return doc && isAssetDoc(doc) ? doc : null;
}

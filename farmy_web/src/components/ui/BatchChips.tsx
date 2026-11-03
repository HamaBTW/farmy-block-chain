import { getDoc } from "@/lib/docStore";
import type { BatchView } from "@/lib/journeyData";
import { hashFromUri, type BatchDoc } from "@/lib/metadata";
import { Chip } from "./Chip";

/** Validation and sale chips for a batch, in the status colors of DESIGN_SYSTEM.md §2. */
export function BatchChips({ batch }: { batch: BatchView }) {
  return (
    <>
      {batch.validated ? <Chip tone="field">✅ Validated</Chip> : <Chip tone="plain">Not validated</Chip>}
      {batch.sale?.state === "Created" && <Chip tone="harvest">🏷️ For sale</Chip>}
      {batch.sale?.state === "Deposited" && <Chip tone="harvest">🔒 Paid into escrow</Chip>}
    </>
  );
}

/** The off-chain description of a batch, when this browser has it. */
export function batchDocOf(uri: string): BatchDoc | null {
  const hash = hashFromUri(uri);
  const doc = hash ? getDoc(hash) : null;
  return doc?.schema === "farmy.batch.v1" ? doc : null;
}

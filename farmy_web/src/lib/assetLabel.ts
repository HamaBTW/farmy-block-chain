import type { AssetKind } from "./journey.ts";
import { productEmoji, type AssetDoc } from "./metadata.ts";

export type AssetLabel = { emoji: string; title: string; detail: string };

export const KIND_NAMES: Record<AssetKind, string> = { land: "Land", machine: "Machine", lot: "Lot" };
const KIND_EMOJI: Record<AssetKind, string> = { land: "🌍", machine: "⚙️", lot: "📦" };

/** How any farm asset is named on screen. A lot's quantity comes from the chain (split children share the parent's details). */
export function assetLabel(kind: AssetKind, doc: AssetDoc | null, quantity: bigint): AssetLabel {
  if (doc?.schema === "farmy.land.v1") return { emoji: "🌍", title: doc.name, detail: `${doc.areaHa} ha in ${doc.location}` };
  if (doc?.schema === "farmy.machine.v1") return { emoji: "⚙️", title: doc.name, detail: `${doc.model}, ${doc.year}` };
  if (doc?.schema === "farmy.batch.v1") {
    return { emoji: productEmoji(doc.product), title: doc.product, detail: `${quantity} ${doc.unit} from ${doc.origin}, harvested ${doc.harvestDate}` };
  }
  return { emoji: KIND_EMOJI[kind], title: KIND_NAMES[kind], detail: kind === "lot" ? `${quantity} units, details kept off-chain` : "Details kept off-chain" };
}

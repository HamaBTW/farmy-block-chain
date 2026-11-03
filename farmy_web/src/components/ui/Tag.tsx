import type { ReactNode } from "react";
import { formatUnits } from "ethers";
import { productEmoji, type BatchDoc } from "@/lib/metadata";
import { PersonName } from "./PersonName";

type Props = {
  batchId: bigint;
  doc: BatchDoc | null;
  price: bigint;
  holder: string;
  chips?: ReactNode;
  size?: "lg" | "sm";
};

/** The batch tag: a kraft-paper produce label, the one bold element of the design (DESIGN_SYSTEM.md §1). */
export function Tag({ batchId, doc, price, holder, chips, size = "sm" }: Props) {
  const lg = size === "lg";
  return (
    <article
      className={`relative bg-kraft text-kraft-ink rounded-lg ${lg ? "p-6 pl-9" : "p-4 pl-7"}`}
      style={{
        clipPath: "polygon(16px 0, 100% 0, 100% 100%, 0 100%, 0 16px)",
        boxShadow: "0 1px 0 var(--line), 0 10px 22px -14px rgb(0 0 0 / 0.45)",
      }}
    >
      <span aria-hidden className="absolute left-3 top-6 h-3 w-3 rounded-full bg-paper shadow-[inset_0_1px_2px_rgb(0_0_0/0.35)]" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold opacity-75">Batch #{batchId.toString()}</p>
          <h3 className={`font-display font-bold leading-tight ${lg ? "text-3xl" : "text-xl"}`}>
            {doc ? `${productEmoji(doc.product)} ${doc.product}` : "📦 Farm batch"}
          </h3>
          <p className="mt-0.5 text-sm opacity-80">
            {doc ? `${doc.quantity} ${doc.unit} from ${doc.origin}, harvested ${doc.harvestDate}` : "Details kept off-chain"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-display font-extrabold leading-none tabular ${lg ? "text-5xl" : "text-3xl"}`}>{formatUnits(price, 18).replace(/\.0$/, "")}</p>
          <p className="text-xs font-semibold opacity-75">FRM last price</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-kraft-ink/30 pt-3 text-sm">
        <span className="inline-flex items-center gap-1">
          <span className="opacity-75">Held by</span> <PersonName address={holder} showAddress={lg} />
        </span>
        {chips && <span className="flex flex-wrap gap-1">{chips}</span>}
      </div>
    </article>
  );
}

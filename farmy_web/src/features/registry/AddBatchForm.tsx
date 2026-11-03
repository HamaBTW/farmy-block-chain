"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "ethers";
import { Choices, Field } from "@/components/ui/Field";
import { PersonPicker } from "@/components/ui/PersonPicker";
import { TxButton } from "@/components/ui/TxButton";
import { saveDoc } from "@/lib/docStore";
import { batchUri, ORIGINS, PRODUCTS, UNITS, type BatchDoc } from "@/lib/metadata";
import { mined } from "@/lib/tx";

const OTHER = "Other…";
const PRICES = ["50", "100", "150"];

/**
 * Adds a batch without typing any URI: the details become a JSON whose hash is the on-chain metadata
 * (`farmy:keccak256:0x…`). The JSON itself stays in this browser and can be downloaded from the batch page.
 */
export function AddBatchForm({ account }: { account: string }) {
  const router = useRouter();
  const [product, setProduct] = useState(PRODUCTS[0].name);
  const [customProduct, setCustomProduct] = useState("");
  const [origin, setOrigin] = useState(ORIGINS[0]);
  const [customOrigin, setCustomOrigin] = useState("");
  const [quantity, setQuantity] = useState("200");
  const [unit, setUnit] = useState(PRODUCTS[0].unit);
  const [harvestDate, setHarvestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [price, setPrice] = useState("100");
  const [holder, setHolder] = useState(account);

  const doc: BatchDoc = {
    schema: "farmy.batch.v1",
    product: product === OTHER ? customProduct.trim() : product,
    origin: origin === OTHER ? customOrigin.trim() : origin,
    quantity: quantity.trim(),
    unit,
    harvestDate,
  };
  let priceWei: bigint | null = null;
  try {
    priceWei = parseUnits(price || "0", 18);
  } catch {
    priceWei = null;
  }
  const complete = !!doc.product && !!doc.origin && !!doc.quantity && !!priceWei && !!holder;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold">1. What is it?</h3>
        <Choices
          options={[...PRODUCTS.map((p) => p.name), OTHER]}
          value={product}
          onChange={(v) => {
            setProduct(v);
            const known = PRODUCTS.find((p) => p.name === v);
            if (known) setUnit(known.unit);
          }}
          render={(v) => `${PRODUCTS.find((p) => p.name === v)?.emoji ?? "📦"} ${v}`}
        />
        {product === OTHER && <input className="input" placeholder="Product name, e.g. Dates" value={customProduct} onChange={(e) => setCustomProduct(e.target.value)} />}
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold">2. Where and how much?</h3>
        <Field label="Origin">
          <Choices options={[...ORIGINS, OTHER]} value={origin} onChange={setOrigin} />
        </Field>
        {origin === OTHER && <input className="input" placeholder="Town or farm" value={customOrigin} onChange={(e) => setCustomOrigin(e.target.value)} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <input className="input tabular" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Unit">
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Harvest date">
          <input className="input" type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold">3. First price and holder</h3>
        <Field label="Initial price (FRM)" hint="The first sale can be at most this price plus the market's max markup.">
          <div className="space-y-2">
            <Choices options={PRICES} value={price} onChange={setPrice} render={(v) => `${v} FRM`} />
            <input className="input tabular" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </Field>
        <PersonPicker label="Who holds it first" value={holder} onChange={setHolder} />
      </section>

      <details className="rounded-xl border border-line bg-paper p-3 text-sm">
        <summary className="cursor-pointer font-semibold">What goes on-chain</summary>
        <p className="mt-2 text-ink-soft">Only this fingerprint of the details is stored. The details stay in this browser and can be downloaded.</p>
        <p className="mt-2 break-all font-mono text-xs">{complete ? batchUri(doc) : "Fill in the details first."}</p>
      </details>

      <TxButton
        label="Add batch"
        done="Batch added"
        variant="primary"
        disabled={!complete}
        send={async (signed) => {
          saveDoc(doc);
          const registry = signed("BatchRegistry");
          const receipt = await mined(registry.mintBatch(holder, batchUri(doc), priceWei!));
          for (const log of receipt.logs) {
            const parsed = registry.interface.parseLog(log);
            if (parsed?.name === "BatchMinted") router.push(`/batch/${parsed.args.batchId}`);
          }
        }}
      />
    </div>
  );
}

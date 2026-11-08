"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "ethers";
import { Choices, Field } from "@/components/ui/Field";
import { TxButton } from "@/components/ui/TxButton";
import { saveDoc } from "@/lib/docStore";
import { batchUri, ORIGINS, PRODUCTS, UNITS, type BatchDoc } from "@/lib/metadata";
import { mined } from "@/lib/tx";

/** Land holder: creates a lot of produce from this land. The lot's details are hashed; quantity and price go on-chain. */
export function HarvestForm({ landId, onDone }: { landId: bigint; onDone: () => void }) {
  const router = useRouter();
  const [product, setProduct] = useState("Olives");
  const [quantity, setQuantity] = useState("1000");
  const [unit, setUnit] = useState("kg");
  const [origin, setOrigin] = useState(ORIGINS[0]);
  const [harvestDate, setHarvestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [price, setPrice] = useState("1000");

  const qtyOk = /^[1-9]\d*$/.test(quantity.trim());
  const doc: BatchDoc = { schema: "farmy.batch.v1", product, origin, quantity: quantity.trim(), unit, harvestDate };
  let priceWei: bigint | null = null;
  try {
    priceWei = parseUnits(price.trim() || "0", 18);
  } catch {
    priceWei = null;
  }
  const complete = qtyOk && !!priceWei && priceWei > BigInt(0);

  return (
    <div className="space-y-4">
      <Choices
        options={PRODUCTS.map((p) => p.name)}
        value={product}
        onChange={(v) => {
          setProduct(v);
          setUnit(PRODUCTS.find((p) => p.name === v)?.unit ?? "kg");
        }}
        render={(v) => `${PRODUCTS.find((p) => p.name === v)?.emoji ?? "📦"} ${v}`}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity (whole units)">
          <input className="input tabular" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Unit">
          <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Where">
        <Choices options={ORIGINS} value={origin} onChange={setOrigin} />
      </Field>
      <Field label="Harvest date">
        <input className="input" type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
      </Field>
      <Field label="First price of the whole lot (FRM)">
        <input className="input tabular" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      {!qtyOk && <p className="text-sm text-harvest-ink">Enter a whole number above 0.</p>}
      <TxButton
        label="Harvest lot"
        done="Lot harvested"
        variant="primary"
        disabled={!complete}
        send={async (signed) => {
          saveDoc(doc);
          const registry = signed("BatchRegistry");
          const receipt = await mined(registry.harvest(landId, batchUri(doc), BigInt(quantity.trim()), priceWei!));
          for (const log of receipt.logs) {
            const parsed = registry.interface.parseLog(log);
            if (parsed?.name === "LotHarvested") router.push(`/batch/${parsed.args.batchId}`);
          }
        }}
        onDone={onDone}
      />
    </div>
  );
}

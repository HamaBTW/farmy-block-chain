"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "ethers";
import { Choices, Field } from "@/components/ui/Field";
import { PersonPicker } from "@/components/ui/PersonPicker";
import { TxButton } from "@/components/ui/TxButton";
import { saveDoc } from "@/lib/docStore";
import { batchUri, ORIGINS, type LandDoc, type MachineDoc } from "@/lib/metadata";
import { usePeople } from "@/lib/people/PeopleProvider";
import { mined } from "@/lib/tx";

const KIND_INDEX = { land: 0, machine: 1 } as const; // BatchRegistry.Kind
type Kind = keyof typeof KIND_INDEX;
const DEFAULTS: Record<Kind, { name: string; price: string }> = { land: { name: "Olive grove", price: "5000" }, machine: { name: "Olive harvester", price: "2000" } };

/** Regulator (land office): registers a land parcel or a machine. The details are hashed into the token URI and kept in this browser. */
export function RegisterAssetForm() {
  const router = useRouter();
  const { people } = usePeople();
  const [kind, setKind] = useState<Kind>("land");
  const [name, setName] = useState(DEFAULTS.land.name);
  const [location, setLocation] = useState(ORIGINS[0]);
  const [areaHa, setAreaHa] = useState("4");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [price, setPrice] = useState(DEFAULTS.land.price);
  const [holder, setHolder] = useState(() => people.find((p) => p.role === "farmer")?.address ?? "");

  const doc: LandDoc | MachineDoc =
    kind === "land"
      ? { schema: "farmy.land.v1", name: name.trim(), location, areaHa: areaHa.trim() }
      : { schema: "farmy.machine.v1", name: name.trim(), model: model.trim(), year: year.trim() };
  let priceWei: bigint | null = null;
  try {
    priceWei = parseUnits(price.trim() || "0", 18);
  } catch {
    priceWei = null;
  }
  const filled = kind === "land" ? !!areaHa.trim() : !!model.trim() && /^\d{4}$/.test(year.trim());
  const complete = !!name.trim() && filled && !!priceWei && priceWei > BigInt(0) && !!holder;

  return (
    <div className="space-y-5">
      <Choices
        options={["land", "machine"]}
        value={kind}
        onChange={(v) => {
          const k = v as Kind;
          setKind(k);
          setName(DEFAULTS[k].name);
          setPrice(DEFAULTS[k].price);
        }}
        render={(v) => (v === "land" ? "🌍 Land" : "⚙️ Machine")}
      />
      <Field label="Name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      {kind === "land" ? (
        <>
          <Field label="Where">
            <Choices options={ORIGINS} value={location} onChange={setLocation} />
          </Field>
          <Field label="Area (ha)">
            <input className="input tabular" inputMode="decimal" value={areaHa} onChange={(e) => setAreaHa(e.target.value)} />
          </Field>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Model">
            <input className="input" placeholder="Pellenc 4560" value={model} onChange={(e) => setModel(e.target.value)} />
          </Field>
          <Field label="Year">
            <input className="input tabular" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
          </Field>
        </div>
      )}
      <Field label="First price (FRM)" hint="The first sale can be at most this price plus the market's max markup.">
        <input className="input tabular" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <PersonPicker label="Who holds it" value={holder} onChange={setHolder} />
      <TxButton
        label={kind === "land" ? "Register land" : "Register machine"}
        done={kind === "land" ? "Land registered" : "Machine registered"}
        variant="primary"
        disabled={!complete}
        send={async (signed) => {
          saveDoc(doc);
          const registry = signed("BatchRegistry");
          const receipt = await mined(registry.registerAsset(holder, KIND_INDEX[kind], batchUri(doc), priceWei!));
          for (const log of receipt.logs) {
            const parsed = registry.interface.parseLog(log);
            if (parsed?.name === "AssetRegistered") router.push(`/batch/${parsed.args.batchId}`);
          }
        }}
      />
    </div>
  );
}

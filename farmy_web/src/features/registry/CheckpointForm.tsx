"use client";

import { useState } from "react";
import { Choices, Field } from "@/components/ui/Field";
import { TxButton } from "@/components/ui/TxButton";
import { saveDoc } from "@/lib/docStore";
import type { AssetKind } from "@/lib/journey";
import { hashDoc, MACHINE_STATES, ORIGINS, SOIL_STATES, type CheckDoc } from "@/lib/metadata";
import { mined } from "@/lib/tx";

const OTHER = "Other…";

type Props = { batchId: bigint; kind: AssetKind; onDone: () => void; validate?: boolean };

/**
 * Inspector's check, with fields that fit the asset: land (area, soil), machine (condition, hours), lot (weight, temperature).
 * The record stays in this browser; only its hash goes on-chain (no hand-typed hash).
 */
export function CheckpointForm({ batchId, kind, onDone, validate = false }: Props) {
  // Lot fields
  const [weightKg, setWeight] = useState("");
  const [temperatureC, setTemperature] = useState("4");
  // Land fields
  const [areaHa, setArea] = useState("");
  const [soil, setSoil] = useState(SOIL_STATES[0]);
  // Machine fields
  const [condition, setCondition] = useState(MACHINE_STATES[0]);
  const [hours, setHours] = useState("");
  // All kinds
  const [location, setLocation] = useState(ORIGINS[0]);
  const [customLocation, setCustomLocation] = useState("");
  const [note, setNote] = useState("");
  const place = location === OTHER ? customLocation.trim() : location;

  const filled =
    kind === "land" ? !!areaHa.trim() : kind === "machine" ? /^\d+$/.test(hours.trim()) : !!weightKg.trim() && !!temperatureC.trim();

  const record = (): CheckDoc => {
    const common = { batchId: batchId.toString(), location: place, note: note.trim(), time: new Date().toISOString() };
    if (kind === "land") return { schema: "farmy.landcheck.v1", ...common, areaHa: areaHa.trim(), soil };
    if (kind === "machine") return { schema: "farmy.machinecheck.v1", ...common, condition, hours: hours.trim() };
    return { schema: "farmy.checkpoint.v1", ...common, weightKg: weightKg.trim(), temperatureC: temperatureC.trim() };
  };

  return (
    <div className="space-y-3">
      {kind === "land" && (
        <>
          <Field label="Area measured (ha)">
            <input className="input tabular" inputMode="decimal" value={areaHa} onChange={(e) => setArea(e.target.value)} placeholder="4" />
          </Field>
          <Field label="Soil">
            <Choices options={SOIL_STATES} value={soil} onChange={setSoil} />
          </Field>
        </>
      )}
      {kind === "machine" && (
        <>
          <Field label="Condition">
            <Choices options={MACHINE_STATES} value={condition} onChange={setCondition} />
          </Field>
          <Field label="Hours used">
            <input className="input tabular" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="1200" />
          </Field>
        </>
      )}
      {kind === "lot" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (kg)">
            <input className="input tabular" inputMode="decimal" value={weightKg} onChange={(e) => setWeight(e.target.value)} placeholder="200" />
          </Field>
          <Field label="Temperature (°C)">
            <input className="input tabular" inputMode="decimal" value={temperatureC} onChange={(e) => setTemperature(e.target.value)} />
          </Field>
        </div>
      )}
      <Field label="Where">
        <Choices options={[...ORIGINS, OTHER]} value={location} onChange={setLocation} />
      </Field>
      {location === OTHER && <input className="input" placeholder="Place of the check" value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} />}
      <Field label="Note (optional)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={NOTE_HINT[kind]} />
      </Field>
      <TxButton
        label={validate ? "Check and validate" : "Add checkpoint"}
        done={validate ? "Checked and validated" : "Checkpoint added"}
        variant={validate ? "primary" : "secondary"}
        disabled={!filled || !place}
        send={async (signed) => {
          const doc = record();
          saveDoc(doc);
          const registry = signed("BatchRegistry");
          await mined(validate ? registry.checkAndValidate(batchId, hashDoc(doc)) : registry.addCheckpoint(batchId, hashDoc(doc)));
        }}
        onDone={() => {
          setWeight("");
          setArea("");
          setHours("");
          setNote("");
          onDone();
        }}
      />
    </div>
  );
}

const NOTE_HINT: Record<AssetKind, string> = {
  land: "Boundaries match the deed",
  machine: "Brakes and blades checked",
  lot: "Crates intact, no bruising",
};

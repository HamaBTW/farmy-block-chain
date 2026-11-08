"use client";

import { useState } from "react";
import { Choices, Field } from "@/components/ui/Field";
import { TxButton } from "@/components/ui/TxButton";
import { saveDoc } from "@/lib/docStore";
import { hashDoc, ORIGINS, type CheckpointDoc } from "@/lib/metadata";
import { mined } from "@/lib/tx";

const OTHER = "Other…";

/** Inspector's check: the record stays in this browser, only its hash goes on-chain (no hand-typed hash). */
export function CheckpointForm({ batchId, onDone, validate = false }: { batchId: bigint; onDone: () => void; validate?: boolean }) {
  const [weightKg, setWeight] = useState("");
  const [temperatureC, setTemperature] = useState("4");
  const [location, setLocation] = useState(ORIGINS[0]);
  const [customLocation, setCustomLocation] = useState("");
  const [note, setNote] = useState("");
  const place = location === OTHER ? customLocation.trim() : location;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight (kg)">
          <input className="input tabular" inputMode="decimal" value={weightKg} onChange={(e) => setWeight(e.target.value)} placeholder="200" />
        </Field>
        <Field label="Temperature (°C)">
          <input className="input tabular" inputMode="decimal" value={temperatureC} onChange={(e) => setTemperature(e.target.value)} />
        </Field>
      </div>
      <Field label="Where">
        <Choices options={[...ORIGINS, OTHER]} value={location} onChange={setLocation} />
      </Field>
      {location === OTHER && <input className="input" placeholder="Place of the check" value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} />}
      <Field label="Note (optional)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Crates intact, no bruising" />
      </Field>
      <TxButton
        label={validate ? "Check and validate" : "Add checkpoint"}
        done={validate ? "Checked and validated" : "Checkpoint added"}
        variant={validate ? "primary" : "secondary"}
        disabled={!weightKg.trim() || !temperatureC.trim() || !place}
        send={async (signed) => {
          const doc: CheckpointDoc = {
            schema: "farmy.checkpoint.v1",
            batchId: batchId.toString(),
            weightKg: weightKg.trim(),
            temperatureC: temperatureC.trim(),
            location: place,
            note: note.trim(),
            time: new Date().toISOString(),
          };
          saveDoc(doc);
          const registry = signed("BatchRegistry");
          await mined(validate ? registry.checkAndValidate(batchId, hashDoc(doc)) : registry.addCheckpoint(batchId, hashDoc(doc)));
        }}
        onDone={() => {
          setWeight("");
          setNote("");
          onDone();
        }}
      />
    </div>
  );
}

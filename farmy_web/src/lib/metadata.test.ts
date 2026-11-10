import { test } from "node:test";
import assert from "node:assert/strict";
import { batchUri, canonicalJson, checkDetail, hashDoc, hashFromUri, isAssetDoc, parseDoc, productEmoji, type BatchDoc, type CheckpointDoc, type LandCheckDoc, type MachineCheckDoc, type LandDoc, type MachineDoc } from "./metadata.ts";

const doc: BatchDoc = { schema: "farmy.batch.v1", product: "Tomatoes", origin: "Sfax", quantity: "200", unit: "kg", harvestDate: "2026-11-01" };

test("canonical JSON has a fixed key order whatever the input order", () => {
  const shuffled = { unit: "kg", harvestDate: "2026-11-01", origin: "Sfax", product: "Tomatoes", quantity: "200", schema: "farmy.batch.v1" } as BatchDoc;
  assert.equal(canonicalJson(shuffled), canonicalJson(doc));
  assert.equal(canonicalJson(doc), '{"schema":"farmy.batch.v1","product":"Tomatoes","origin":"Sfax","quantity":"200","unit":"kg","harvestDate":"2026-11-01"}');
});

test("hash is a bytes32 and changes when any field changes", () => {
  assert.match(hashDoc(doc), /^0x[0-9a-f]{64}$/);
  assert.notEqual(hashDoc(doc), hashDoc({ ...doc, quantity: "201" }));
});

test("checkpoint docs hash too", () => {
  const cp: CheckpointDoc = { schema: "farmy.checkpoint.v1", batchId: "1", weightKg: "200", temperatureC: "4", location: "Sfax", note: "", time: "2026-11-03T10:00:00.000Z" };
  assert.match(hashDoc(cp), /^0x[0-9a-f]{64}$/);
});

test("uri round-trips to the hash", () => {
  assert.equal(hashFromUri(batchUri(doc)), hashDoc(doc));
  assert.equal(hashFromUri("ipfs://demo/tomatoes"), null);
});

test("parseDoc accepts our schemas only", () => {
  assert.deepEqual(parseDoc(canonicalJson(doc)), doc);
  assert.equal(parseDoc('{"schema":"other"}'), null);
  assert.equal(parseDoc('{"schema":"farmy.batch.v1","product":"Tomatoes"}'), null);
  assert.equal(parseDoc("not json"), null);
});

test("land and machine checks have their own fields, hash and parse back", () => {
  const land: LandCheckDoc = { schema: "farmy.landcheck.v1", batchId: "1", areaHa: "4", soil: "Good", location: "Sfax", note: "Boundaries match", time: "2026-11-10T10:00:00.000Z" };
  const machine: MachineCheckDoc = { schema: "farmy.machinecheck.v1", batchId: "2", condition: "Working", hours: "1200", location: "Sfax", note: "", time: "2026-11-10T10:00:00.000Z" };
  assert.deepEqual(parseDoc(canonicalJson(land)), land);
  assert.deepEqual(parseDoc(canonicalJson(machine)), machine);
  assert.notEqual(hashDoc(land), hashDoc({ ...land, soil: "Poor" }));
});

test("only land, machine and lot details count as asset details", () => {
  const land: LandDoc = { schema: "farmy.land.v1", name: "Olive grove", location: "Sfax", areaHa: "4" };
  assert.equal(isAssetDoc(land), true);
  assert.equal(isAssetDoc(doc), true);
  const cp: CheckpointDoc = { schema: "farmy.checkpoint.v1", batchId: "1", weightKg: "200", temperatureC: "4", location: "Sfax", note: "", time: "t" };
  assert.equal(isAssetDoc(cp), false);
  assert.equal(isAssetDoc({ schema: "farmy.landcheck.v1", batchId: "1", areaHa: "4", soil: "Good", location: "Sfax", note: "", time: "t" }), false);
});

test("check details read naturally for each kind", () => {
  assert.equal(
    checkDetail({ schema: "farmy.checkpoint.v1", batchId: "2", weightKg: "998", temperatureC: "4", location: "Sfax", note: "", time: "t" }),
    "998 kg · 4 °C · Sfax",
  );
  assert.equal(
    checkDetail({ schema: "farmy.landcheck.v1", batchId: "1", areaHa: "4", soil: "Good", location: "Sfax", note: "Boundaries match", time: "t" }),
    "4 ha measured · soil good · Sfax · Boundaries match",
  );
  assert.equal(
    checkDetail({ schema: "farmy.machinecheck.v1", batchId: "3", condition: "Needs repair", hours: "1200", location: "Béja", note: "", time: "t" }),
    "needs repair · 1200 h used · Béja",
  );
});

test("product emoji", () => {
  assert.equal(productEmoji("tomatoes"), "🍅");
  assert.equal(productEmoji("Saffron"), "📦");
});

test("land and machine docs hash and parse back", () => {
  const land: LandDoc = { schema: "farmy.land.v1", name: "Olive grove", location: "Sfax", areaHa: "4" };
  const machine: MachineDoc = { schema: "farmy.machine.v1", name: "Olive harvester", model: "Pellenc 4560", year: "2024" };
  assert.equal(canonicalJson(land), '{"schema":"farmy.land.v1","name":"Olive grove","location":"Sfax","areaHa":"4"}');
  assert.deepEqual(parseDoc(canonicalJson(land)), land);
  assert.deepEqual(parseDoc(canonicalJson(machine)), machine);
  assert.equal(hashFromUri(batchUri(machine)), hashDoc(machine));
});

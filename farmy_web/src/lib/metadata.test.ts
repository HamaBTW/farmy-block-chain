import { test } from "node:test";
import assert from "node:assert/strict";
import { batchUri, canonicalJson, hashDoc, hashFromUri, parseDoc, productEmoji, type BatchDoc, type CheckpointDoc } from "./metadata.ts";

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

test("product emoji", () => {
  assert.equal(productEmoji("tomatoes"), "🍅");
  assert.equal(productEmoji("Saffron"), "📦");
});

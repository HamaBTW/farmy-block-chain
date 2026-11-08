import { test } from "node:test";
import assert from "node:assert/strict";
import { assetLabel, KIND_NAMES } from "./assetLabel.ts";

test("land, machine and lot docs", () => {
  assert.deepEqual(assetLabel("land", { schema: "farmy.land.v1", name: "Olive grove", location: "Sfax", areaHa: "4" }, BigInt(0)), {
    emoji: "🌍", title: "Olive grove", detail: "4 ha in Sfax",
  });
  assert.deepEqual(assetLabel("machine", { schema: "farmy.machine.v1", name: "Olive harvester", model: "Pellenc 4560", year: "2024" }, BigInt(0)), {
    emoji: "⚙️", title: "Olive harvester", detail: "Pellenc 4560, 2024",
  });
  const lot = assetLabel("lot", { schema: "farmy.batch.v1", product: "Olives", origin: "Sfax", quantity: "1000", unit: "kg", harvestDate: "2026-11-08" }, BigInt(600));
  assert.deepEqual(lot, { emoji: "🫒", title: "Olives", detail: "600 kg from Sfax, harvested 2026-11-08" });
});

test("without details the kind is shown and a lot keeps its on-chain quantity", () => {
  assert.deepEqual(assetLabel("lot", null, BigInt(400)), { emoji: "📦", title: "Lot", detail: "400 units, details kept off-chain" });
  assert.deepEqual(assetLabel("land", null, BigInt(0)), { emoji: "🌍", title: "Land", detail: "Details kept off-chain" });
  assert.equal(KIND_NAMES.machine, "Machine");
});

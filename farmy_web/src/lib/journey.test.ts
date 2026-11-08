import { test } from "node:test";
import assert from "node:assert/strict";
import { canDo, nextSteps, primaryStep, type JourneyState, type OpenSale } from "./journey.ts";

const farmer = "0xf", seller = "0x5e", buyer = "0xb", other = "0x0";
const one = BigInt(1);
const base: JourneyState = { batchId: one, kind: "lot", closed: false, custodian: farmer, validated: false, lastPrice: BigInt(100), sale: null };
const sale = (state: OpenSale["state"], b = buyer): OpenSale => ({ id: one, seller, buyer: b, price: BigInt(115), state });
const actions = (s: JourneyState) => nextSteps(s).map((x) => x.action + (x.primary ? "*" : ""));

test("not validated, no sale: inspector validates, holder can hand over", () => {
  assert.deepEqual(actions(base), ["validate*", "addCheckpoint", "handOver"]);
});

test("validated, no sale: holder lists for sale", () => {
  assert.deepEqual(actions({ ...base, validated: true }), ["listForSale*", "split", "handOver"]);
});

test("listed by the holder: others buy, seller cancels", () => {
  const s: JourneyState = { ...base, custodian: seller, validated: true, sale: sale("Created", "0x") };
  assert.deepEqual(actions(s), ["buy*", "cancelListing"]);
  const buy = nextSteps(s)[0];
  assert.equal(canDo(buy, buyer, false), true);
  assert.equal(canDo(buy, seller, false), false);
});

test("listing whose seller lost the goods: anyone clears it", () => {
  const s: JourneyState = { ...base, custodian: other, validated: true, sale: sale("Created", "0x") };
  assert.deepEqual(actions(s), ["clearListing*"]);
});

test("paid, validated, seller still holds the goods: hand to buyer", () => {
  const s: JourneyState = { ...base, custodian: seller, validated: true, sale: sale("Deposited") };
  assert.deepEqual(actions(s), ["handToBuyer*", "refundBuyer", "refundMe"]);
});

test("paid but not validated: inspector validates first, no hand-over yet", () => {
  const s: JourneyState = { ...base, custodian: seller, validated: false, sale: sale("Deposited") };
  assert.deepEqual(actions(s), ["validate*", "addCheckpoint", "refundBuyer", "refundMe"]);
});

test("paid, validated, delivered: release, and the buyer can no longer refund", () => {
  const s: JourneyState = { ...base, custodian: buyer, validated: true, sale: sale("Deposited") };
  assert.deepEqual(actions(s), ["release*", "refundBuyer"]);
  assert.equal(canDo(primaryStep(nextSteps(s))!, other, false), true);
});

test("paid, goods went to someone else: the buyer gets the money back", () => {
  const s: JourneyState = { ...base, custodian: other, validated: true, sale: sale("Deposited") };
  assert.deepEqual(actions(s), ["refundMe*", "refundBuyer"]);
});

test("addresses compare case-insensitively and inspectors are recognized", () => {
  const [validate, , handOver] = nextSteps(base);
  assert.equal(canDo(validate, "0xABC", true), true);
  assert.equal(canDo(validate, "0xABC", false), false);
  assert.equal(canDo(handOver, "0xF", false), true);
  assert.equal(canDo(handOver, null, false), false);
});

test("every action has a phrase", async () => {
  const { STEP_PHRASES } = await import("./journey.ts");
  assert.equal(Object.keys(STEP_PHRASES).length, 13);
});

test("land: the holder can harvest; the inspector validates first", () => {
  const land: JourneyState = { ...base, kind: "land" };
  assert.deepEqual(actions(land), ["validate*", "addCheckpoint", "harvest", "handOver"]);
  assert.deepEqual(actions({ ...land, validated: true }), ["listForSale*", "harvest", "handOver"]);
});

test("machines have no harvest or split", () => {
  assert.deepEqual(actions({ ...base, kind: "machine", validated: true }), ["listForSale*", "handOver"]);
});

test("an unvalidated lot can't be split yet; a split (closed) lot has no steps", () => {
  assert.deepEqual(actions(base), ["validate*", "addCheckpoint", "handOver"]);
  assert.deepEqual(actions({ ...base, validated: true, closed: true }), []);
});

test("no split while the lot is listed", () => {
  const s: JourneyState = { ...base, custodian: seller, validated: true, sale: sale("Created", "0x") };
  assert.ok(!actions(s).includes("split"));
});

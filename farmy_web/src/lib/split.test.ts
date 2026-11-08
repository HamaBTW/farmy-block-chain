import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSplit, splitPrices } from "./split.ts";

const b = (...xs: number[]) => xs.map((x) => BigInt(x));

test("prices are shared in proportion and add up exactly (last part takes the rounding)", () => {
  assert.deepEqual(splitPrices(BigInt(1000), b(600, 400)), b(600, 400));
  assert.deepEqual(splitPrices(BigInt(100), b(1, 1, 1)), b(33, 33, 34));
});

test("split checks mirror the contract", () => {
  assert.equal(checkSplit(BigInt(1000), b(600, 400)), null);
  assert.equal(checkSplit(BigInt(1000), b(1000)), "Split into at least 2 parts.");
  assert.equal(checkSplit(BigInt(1000), Array(11).fill(BigInt(1))), "Split into at most 10 parts.");
  assert.equal(checkSplit(BigInt(1000), b(1000, 0)), "Every part needs a quantity above 0.");
  assert.equal(checkSplit(BigInt(1000), b(600, 300)), "The parts add up to 900, but the lot has 1000.");
});

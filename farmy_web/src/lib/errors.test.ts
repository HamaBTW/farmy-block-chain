import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUnits } from "ethers";
import { ERROR_HELP, friendlyError } from "./errors.ts";

test("price cap error shows the cap in FRM", () => {
  assert.equal(
    friendlyError({ name: "PriceAboveCap", args: [parseUnits("150", 18), parseUnits("120", 18)] }),
    "This price is above the cap of 120 FRM. Lower it or ask the market authority to raise the markup.",
  );
});

test("balance error shows both amounts", () => {
  assert.equal(
    friendlyError({ name: "ERC20InsufficientBalance", args: ["0xabc", parseUnits("10", 18), parseUnits("115", 18)] }),
    "You have 10 FRM but need 115 FRM. Ask the market authority to mint more.",
  );
});

test("wrong state names the sale state", () => {
  assert.equal(friendlyError({ name: "WrongState", args: [BigInt(3)] }), "This sale is already released.");
  assert.equal(friendlyError({ name: "WrongState", args: [BigInt(0)] }), "This sale doesn't exist.");
});

test("unknown errors fall back to the raw name", () => {
  assert.equal(friendlyError({ name: "Weird", args: [BigInt(1)] }), "Reverted: Weird(1)");
});

test("the guide table has one plain sentence per known error", () => {
  assert.ok(ERROR_HELP.length >= 20);
  assert.ok(ERROR_HELP.every((e) => !e.meaning.startsWith("Reverted:")));
});

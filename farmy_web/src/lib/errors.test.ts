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
    "You have 10 FRM but need 115 FRM. Buy more FRM with ETH on the Market.",
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

test("v2 errors have plain sentences", () => {
  assert.equal(friendlyError({ name: "LotClosed", args: [] }), "This lot was split. Use its smaller lots instead.");
  assert.equal(friendlyError({ name: "NotActive", args: [] }), "This lot was split, so it can't be listed. List one of its smaller lots.");
  assert.equal(
    friendlyError({ name: "ERC20ExceededCap", args: [parseUnits("1000001", 18), parseUnits("1000000", 18)] }),
    "That would pass FarmCoin's max supply of 1000000 FRM.",
  );
  assert.equal(friendlyError({ name: "BadSplit", args: [] }), "Split into 2 to 10 parts that add up to the lot's quantity.");
});

test("asset wording, not batch wording", () => {
  assert.equal(friendlyError({ name: "ERC721NonexistentToken", args: [BigInt(7)] }), "Asset #7 doesn't exist.");
  assert.equal(friendlyError({ name: "UnknownBatch", args: [BigInt(7)] }), "Asset #7 doesn't exist.");
  assert.equal(friendlyError({ name: "BatchAlreadyListed", args: [BigInt(1)] }), "This asset is already listed (sale #1). Cancel that listing first.");
  assert.equal(friendlyError({ name: "NotValidated", args: [] }), "It isn't validated yet. An inspector has to check and validate it first.");
  assert.equal(friendlyError({ name: "ERC721IncorrectOwner", args: [] }), "Only the person holding it can hand it over.");
});

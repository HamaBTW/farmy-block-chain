import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPeople, findPerson, personLabel } from "./people.ts";

const accounts = Array.from({ length: 11 }, (_, i) => "0x" + String(i).padStart(40, "a"));

test("names Ganache accounts by index, extra accounts become guests", () => {
  const people = buildPeople(accounts, {});
  assert.deepEqual(people.slice(0, 7).map((p) => p.role), ["regulator", "inspector", "farmer", "transporter", "warehouse", "buyer", "retailer"]);
  assert.equal(people[2].name, "Farmer");
  assert.equal(people[2].emoji, "🧑‍🌾");
  assert.equal(people[10].name, "Guest 4");
});

test("renames win over defaults and are matched case-insensitively", () => {
  const people = buildPeople(accounts, { [accounts[5].toUpperCase()]: "Amira" });
  assert.equal(people[5].name, "Amira");
  assert.equal(findPerson(people, accounts[5].toUpperCase())?.index, 5);
});

test("labels unknown addresses with the short address", () => {
  const people = buildPeople(accounts, {});
  assert.equal(personLabel(people, accounts[3]), "🚚 Transporter");
  assert.equal(personLabel(people, "0x1234567890123456789012345678901234567890"), "0x1234…7890");
});

# Farmy UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `farmy_web` into a friendly farm-market app: named demo people instead of pasted addresses, generated metadata and checkpoint hashes, a per-batch journey with one "Next step" button, Demo mode, and a built-in guide.

**Architecture:** Pure logic (`lib/people.ts`, `lib/metadata.ts`, `lib/errors.ts`, `lib/journey.ts`) is tested with Node's built-in runner. React context providers (`WalletProvider` with Demo mode, `PeopleProvider`) feed shared UI primitives in `components/ui/`. A's `features/registry/` and B's `features/payment/` keep their own screens; `app/batch/[id]` composes them without the features importing each other.

**Tech Stack:** Next.js 16.4 App Router, React 19, TypeScript, Tailwind 4, ethers 6.17, `next/font/google` (Bricolage Grotesque, Figtree, Geist Mono), `node --test` (Node 22.19 strips types natively).

**Spec:** `docs/superpowers/specs/2026-11-03-farmy-ui-redesign-design.md` · **Visual rules:** `farmy_web/DESIGN_SYSTEM.md`

## Global Constraints
- No contract changes. `npx truffle test --network development` in `farmy_blockchain/` stays at 99 passing.
- No new npm dependencies. Fonts only through `next/font/google`.
- Colors only through the tokens in `globals.css` (DESIGN_SYSTEM.md §2). Amber text uses `--harvest-ink`.
- Sentence case, no ALL-CAPS labels, no trailing "→" on buttons, one primary button per panel (DESIGN_SYSTEM.md §3, §6, §8).
- Words: batch, hand over, pay into escrow, release payment, refund, cancel listing, cap (DESIGN_SYSTEM.md §8).
- Demo mode only when the read provider reports chain id 1337. MetaMask stays available; the app never asks for or stores private keys.
- Routes `/registry` and `/market` keep their paths.
- Every A-owned or shared file touched is logged in `farmy_blockchain/roadmap-B.md` (Decisions Log).
- Each task ends with `npm run lint`, `npm run build` (and `npm test` once it exists) passing in `farmy_web/`, then a commit `UI0N: …`.

## File map
| File | Status | Responsibility |
|------|--------|----------------|
| `farmy_web/tsconfig.json` | modify | `allowImportingTsExtensions` so tests import `./x.ts` |
| `farmy_web/package.json` | modify | `"test": "node --test src/lib/"` |
| `src/app/globals.css` | rewrite | tokens light/dark, base styles, focus ring, reduced motion |
| `src/app/layout.tsx` | rewrite | fonts, providers, header, footer, toast host |
| `src/components/ui/Button.tsx` | new | `Button` variants |
| `src/components/ui/Card.tsx` | new | `Card`, `CardTitle` |
| `src/components/ui/Chip.tsx` | new | status chip |
| `src/components/ui/Toast.tsx` | new | `ToastProvider`, `useToast` |
| `src/components/ui/TxButton.tsx` | new | button that runs a transaction |
| `src/components/ui/PersonName.tsx` | new | address → emoji + name + short address + copy |
| `src/components/ui/PersonPicker.tsx` | new | pill buttons per person + "Other address…" |
| `src/components/ui/AmountInput.tsx` | new | FRM input + quick chips |
| `src/components/ui/Tag.tsx` | new | kraft batch tag |
| `src/components/ui/Stamp.tsx` | new | one timeline stamp |
| `src/components/Header.tsx` | new | nav + "Acting as" switcher / MetaMask button |
| `src/components/NextStepBanner.tsx` | new | top hint across all batches |
| `src/components/SetupCard.tsx` | new | replaces `ConnectionStatus` content (Ganache, contracts, wallet) |
| `src/lib/people.ts` (+ `.test.ts`) | new | default people, build/find/label |
| `src/lib/people/PeopleProvider.tsx` | new | accounts from Ganache, renames, chain roles |
| `src/lib/metadata.ts` (+ `.test.ts`) | new | docs schemas, canonical JSON, hashes, URIs, products |
| `src/lib/docStore.ts` | new | localStorage copy of docs, download, verify |
| `src/lib/errors.ts` (+ `.test.ts`) | new | revert → sentence |
| `src/lib/journey.ts` (+ `.test.ts`) | new | `nextSteps(state)` + `canDo` |
| `src/lib/journeyData.ts` | new | load `JourneyState` for one / all batches |
| `src/lib/tx.ts` | modify | use `friendlyError`, expose `isDemo` pending label |
| `src/lib/wallet/WalletProvider.tsx` | modify | Demo mode |
| `src/features/registry/*` (A) | rewrite | batch grid, mint wizard, `BatchJourney`, checkpoint form, regulator drawer |
| `src/features/payment/*` (B) | rewrite | market list, `SalePanel`, authority drawer |
| `src/app/page.tsx`, `registry/page.tsx`, `market/page.tsx` | modify | thin pages |
| `src/app/batch/[id]/page.tsx`, `people/page.tsx`, `guide/page.tsx` | new | thin pages |
| `src/features/guide/GuideHome.tsx`, `src/features/people/PeopleHome.tsx` | new | shared screens (log as shared) |

---

### Task UI01: Foundations (tokens, fonts, primitives, test runner)

**Files:** modify `tsconfig.json`, `package.json`, rewrite `src/app/globals.css`, `src/app/layout.tsx`; create `components/ui/Button.tsx`, `Card.tsx`, `Chip.tsx`, `Toast.tsx`.

**Interfaces — Produces:**
- `Button(props: ButtonHTMLAttributes & { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "md" | "sm" })`
- `Card({ children, className })`, `CardTitle({ children })`
- `Chip({ tone: "field" | "harvest" | "beet" | "sky" | "plain", children })`
- `ToastProvider`, `useToast(): { show(message: string, tone?: "field" | "beet"): void }`
- Tailwind color names: `paper card ink ink-soft line field field-ink harvest harvest-ink beet sky kraft kraft-ink` and `*-wash` for field/harvest/beet/sky; font utilities `font-display`, `font-sans`, `font-mono`.

- [ ] **Step 1:** `tsconfig.json` add `"allowImportingTsExtensions": true` to `compilerOptions`; `package.json` scripts add `"test": "node --test src/lib/"`.
- [ ] **Step 2:** Rewrite `globals.css`: `@import "tailwindcss";`, `:root` tokens from DESIGN_SYSTEM.md §2, dark tokens under `@media (prefers-color-scheme: dark)`, `@theme inline` mapping `--color-<name>: var(--<name>)` and fonts `--font-display/--font-sans/--font-mono`, `body { background: var(--paper); color: var(--ink); font-family: var(--font-sans) }`, `:focus-visible { outline: 2px solid var(--sky); outline-offset: 2px }`, `.tabular { font-variant-numeric: tabular-nums }`, `@keyframes stamp-in` (scale 1.15→1, rotate -6deg→-2deg, 220ms) + `.stamp-in`, and `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation: none !important; transition: none !important } }`. Keep `.input` component class: `w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft`.
- [ ] **Step 3:** Primitives with the variants above. Button heights ≥ 40px (`h-10`, `sm` = `h-9`), radius `rounded-xl`, primary `bg-field text-field-ink hover:brightness-110`, secondary `bg-card border border-line`, danger `bg-beet text-white`, ghost `hover:bg-field-wash`. Chip `rounded-full px-2.5 py-0.5 text-xs font-medium` with `bg-<tone>-wash text-<tone>` (`text-harvest-ink` for harvest). Toast: fixed bottom-center stack, auto-hide 4000 ms, `role="status"`.
- [ ] **Step 4:** `layout.tsx`: load `Bricolage_Grotesque` (variable `--font-bricolage`, weights 600–800), `Figtree` (`--font-figtree`), `Geist_Mono`; wrap `WalletProvider > PeopleProvider > ToastProvider`; render `<Header />` (Task UI03; until then keep the old nav markup), `<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">`, footer "Simulated goods and money on a local test chain."
- [ ] **Step 5:** Run `npm run lint && npm run build` in `farmy_web/` → both pass. Commit `UI01: design tokens, fonts and UI primitives`.

### Task UI02: Demo people

**Files:** create `src/lib/people.ts`, `src/lib/people.test.ts`, `src/lib/people/PeopleProvider.tsx`, `components/ui/PersonName.tsx`, `components/ui/PersonPicker.tsx`, `src/features/people/PeopleHome.tsx`, `src/app/people/page.tsx`.

**Interfaces — Produces:**
```ts
export type PersonRole = "regulator" | "inspector" | "farmer" | "transporter" | "warehouse" | "buyer" | "retailer" | "guest";
export type Person = { address: string; index: number; name: string; emoji: string; role: PersonRole };
export function buildPeople(accounts: string[], renames: Record<string, string>): Person[];
export function findPerson(people: Person[], address: string | null | undefined): Person | undefined;
export function personLabel(people: Person[], address: string): string; // "🛒 Buyer" or "0x1234…abcd"
// PeopleProvider context:
type PeopleState = { people: Person[]; loaded: boolean; rename(address: string, name: string): void; reset(): void;
  chainRoles: { regulator: string | null; authority: string | null; inspectors: string[] } };
export function usePeople(): PeopleState;
```

- [ ] **Step 1: failing test** `src/lib/people.test.ts`:
```ts
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
```
- [ ] **Step 2:** `cd farmy_web && npm test` → FAIL (module not found).
- [ ] **Step 3: implement** `src/lib/people.ts`:
```ts
export type PersonRole = "regulator" | "inspector" | "farmer" | "transporter" | "warehouse" | "buyer" | "retailer" | "guest";
export type Person = { address: string; index: number; name: string; emoji: string; role: PersonRole };

/** Default demo cast, by Ganache account index (same order as test/integration/lifecycle.test.js). */
const CAST: { name: string; emoji: string; role: PersonRole }[] = [
  { name: "Regulator", emoji: "🏛️", role: "regulator" },
  { name: "Inspector", emoji: "🔍", role: "inspector" },
  { name: "Farmer", emoji: "🧑‍🌾", role: "farmer" },
  { name: "Transporter", emoji: "🚚", role: "transporter" },
  { name: "Warehouse", emoji: "🏬", role: "warehouse" },
  { name: "Buyer", emoji: "🛒", role: "buyer" },
  { name: "Retailer", emoji: "🧺", role: "retailer" },
];

export function buildPeople(accounts: string[], renames: Record<string, string>): Person[] {
  const lowerRenames = Object.fromEntries(Object.entries(renames).map(([a, n]) => [a.toLowerCase(), n]));
  return accounts.map((address, index) => {
    const cast = CAST[index] ?? { name: `Guest ${index - CAST.length + 1}`, emoji: "👤", role: "guest" as const };
    return { address, index, emoji: cast.emoji, role: cast.role, name: lowerRenames[address.toLowerCase()] ?? cast.name };
  });
}

export function findPerson(people: Person[], address: string | null | undefined): Person | undefined {
  if (!address) return undefined;
  const a = address.toLowerCase();
  return people.find((p) => p.address.toLowerCase() === a);
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function personLabel(people: Person[], address: string): string {
  const p = findPerson(people, address);
  return p ? `${p.emoji} ${p.name}` : shortAddress(address);
}
```
- [ ] **Step 4:** `npm test` → PASS (3 tests).
- [ ] **Step 5: PeopleProvider** — on mount `getReadProvider().send("eth_accounts", [])`; renames from `localStorage["farmy.people.v1"]` (try/catch → `{}`); `chainRoles` refreshed with `useChainVersion().version`: `registry.owner()`, `escrow.owner()`, and `registry.isInspector(a)` for every account (skip contracts that aren't deployed). `rename` writes storage; `reset` clears it.
- [ ] **Step 6: PersonName** `({ address, showAddress = true })`: `findPerson` → emoji + name (`font-medium`), then short address `font-mono text-xs text-ink-soft` and a copy button (`navigator.clipboard.writeText`, toast "Address copied").
- [ ] **Step 7: PersonPicker** `({ value, onChange, exclude?: string[], label })`: pill buttons for each person (not in `exclude`), selected = `bg-field text-field-ink`; last pill "Other address…" reveals `.input` validated with `ethers.isAddress`, message "That isn't a valid address." under it.
- [ ] **Step 8: /people page** — `PeopleHome`: card per person (emoji, name, role, chips Regulator/Inspector/Market authority from `chainRoles`, FRM balance via `FarmCoin.balanceOf`, `PersonName`), inline rename (input + "Save name"), "Reset names", and "Act as" button (Demo mode, Task UI03).
- [ ] **Step 9:** `npm test && npm run lint && npm run build` pass. Commit `UI02: named demo people, person picker and People page`.

### Task UI03: Demo mode + header

**Files:** modify `src/lib/wallet/WalletProvider.tsx`, `src/lib/tx.ts`; create `src/components/Header.tsx`; modify `layout.tsx`; delete `components/WalletButton.tsx`.

**Interfaces — Produces (added to `WalletState`):**
```ts
mode: "metamask" | "demo";
demoAvailable: boolean;            // read provider chain id === 1337
setMode(mode: "metamask" | "demo"): void;
actAs(address: string): void;      // demo: choose person
// existing: account (demo person or MetaMask account), isOnGanache (true in demo when demoAvailable), getSigner()
```

- [ ] **Step 1:** Add state `mode`, `demoAccount`, persisted in `localStorage["farmy.wallet.v1"]` as `{ mode, demoAccount }` (try/catch). Default mode: `"demo"` when no MetaMask, else `"metamask"`.
- [ ] **Step 2:** `demoAvailable`: `getReadProvider().getNetwork()` → `Number(chainId) === 1337`.
- [ ] **Step 3:** `account = mode === "demo" ? demoAccount : metamaskAccount`; `isOnGanache = mode === "demo" ? demoAvailable : chainId === 1337`; `getSigner`: demo → `getReadProvider().getSigner(demoAccount)` (throws "Choose who you are first." if none, or "Demo mode only works on the local Ganache chain." if `!demoAvailable`); metamask → unchanged.
- [ ] **Step 4:** `tx.ts`: replace `revertMessage` sentence building with `friendlyError` (Task UI04 provides it; in this task keep the existing function) and export `useContractTx` returning `{ run, pending, error, pendingLabel }` where `pendingLabel = mode === "demo" ? "Sending…" : "Confirm in MetaMask…"`.
- [ ] **Step 5: Header** — logo "Farmy" (`font-display text-xl`, field green with 🌾), nav links Home, Batches (`/registry`), Market, Guide, People, active link underlined in field. Right side: in demo mode a button "Acting as 🧑‍🌾 Farmer ▾" opening a menu of people (`actAs`) + "Use MetaMask instead"; in metamask mode the MetaMask states (Install / Connect / Switch to Farmy / short address) + "Use Demo mode" when `demoAvailable`. When demo mode is on and `account` is null after people load, call `actAs(people[2].address)` (Farmer).
- [ ] **Step 6:** Mobile: nav collapses into a "Menu" button below 768px.
- [ ] **Step 7:** lint + build pass; in the browser switch person and see the header change. Commit `UI03: Demo mode and header person switcher`.

### Task UI04: Friendly errors + TxButton

**Files:** create `src/lib/errors.ts`, `src/lib/errors.test.ts`, `components/ui/TxButton.tsx`; modify `src/lib/tx.ts`.

**Interfaces — Produces:**
```ts
export type DecodedError = { name: string; args: readonly unknown[] };
export function friendlyError(e: DecodedError): string;
export const ERROR_HELP: { name: string; meaning: string }[]; // for the guide's error table
// TxButton
type TxButtonProps = { label: string; done: string; variant?: ButtonVariant; disabled?: boolean;
  send: (signed: Signed) => Promise<unknown>; onDone?: () => void };
```

- [ ] **Step 1: failing test** `src/lib/errors.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUnits } from "ethers";
import { friendlyError } from "./errors.ts";

test("price cap error shows the cap in FRM", () => {
  assert.equal(friendlyError({ name: "PriceAboveCap", args: [parseUnits("150", 18), parseUnits("120", 18)] }),
    "This price is above the cap of 120 FRM. Lower it or ask the market authority to raise the markup.");
});

test("balance error shows both amounts", () => {
  assert.equal(friendlyError({ name: "ERC20InsufficientBalance", args: ["0xabc", parseUnits("10", 18), parseUnits("115", 18)] }),
    "You have 10 FRM but need 115 FRM. Ask the market authority to mint more.");
});

test("wrong state names the sale state", () => {
  assert.equal(friendlyError({ name: "WrongState", args: [3n] }), "This sale is already released.");
  assert.equal(friendlyError({ name: "WrongState", args: [0n] }), "This sale doesn't exist.");
});

test("unknown errors fall back to the raw name", () => {
  assert.equal(friendlyError({ name: "Weird", args: [1n] }), "Reverted: Weird(1)");
});
```
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: implement** `src/lib/errors.ts`:
```ts
import { formatUnits } from "ethers";

export type DecodedError = { name: string; args: readonly unknown[] };

const frm = (v: unknown) => `${formatUnits(v as bigint, 18)} FRM`;
const STATES = ["None", "created", "paid into escrow", "released", "refunded"];

const MESSAGES: Record<string, (args: readonly unknown[]) => string> = {
  PriceAboveCap: (a) => `This price is above the cap of ${frm(a[1])}. Lower it or ask the market authority to raise the markup.`,
  ZeroPrice: () => "Enter a price above 0.",
  ZeroAddress: () => "Pick a person or enter a valid address.",
  NotCustodian: () => "Only the person holding this batch can list it.",
  BatchAlreadyListed: (a) => `This batch is already listed (sale #${a[0]}). Cancel that listing first.`,
  WrongState: (a) => (Number(a[0]) === 0 ? "This sale doesn't exist." : `This sale is already ${STATES[Number(a[0])]}.`),
  SellerCannotBuy: () => "You can't buy your own listing.",
  NotValidated: () => "The batch isn't validated yet. An inspector has to validate it first.",
  CustodyNotMoved: () => "The goods haven't been handed to the buyer yet.",
  NotAllowed: () => "Only the seller or the buyer can do that right now.",
  ReleaseConditionsMet: () => "The goods are validated and delivered, so the payment can only be released now.",
  NotInspector: () => "Only an inspector can do that. Ask the regulator to add you as an inspector.",
  AlreadyValidated: () => "This batch is already validated.",
  NotEscrow: () => "Only the escrow contract can record sale prices.",
  OwnableUnauthorizedAccount: () => "Only the regulator / market authority can do that.",
  ERC20InsufficientAllowance: () => "The escrow isn't allowed to take your FRM yet. Approve the payment first.",
  ERC20InsufficientBalance: (a) => `You have ${frm(a[1])} but need ${frm(a[2])}. Ask the market authority to mint more.`,
  ERC721IncorrectOwner: () => "Only the person holding this batch can hand it over.",
  ERC721NonexistentToken: (a) => `Batch #${a[0]} doesn't exist.`,
  ERC721InvalidReceiver: () => "Pick who receives the batch.",
};

export function friendlyError({ name, args }: DecodedError): string {
  const message = MESSAGES[name];
  return message ? message(args) : `Reverted: ${name}(${args.map(String).join(", ")})`;
}

/** One line per error, for the guide. */
export const ERROR_HELP = Object.keys(MESSAGES).map((name) => ({ name, meaning: friendlyError({ name, args: SAMPLE_ARGS[name] ?? [] }) }));
```
with `SAMPLE_ARGS` defined above `ERROR_HELP`: `{ PriceAboveCap: [150n * 10n ** 18n, 120n * 10n ** 18n], BatchAlreadyListed: [1n], WrongState: [3n], ERC20InsufficientBalance: ["0x0", 10n * 10n ** 18n, 115n * 10n ** 18n], ERC721NonexistentToken: [7n] }`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `tx.ts`: `revertMessage` returns `friendlyError(revert)` when decoded; `ACTION_REJECTED` → "You cancelled the transaction in MetaMask."
- [ ] **Step 6: TxButton** — renders `Button`, on click `run(async (signed) => { await send(signed); })`; on success `toast.show(done)` and `onDone?.()`; pending shows `pendingLabel`; error sentence below in `text-beet text-sm`.
- [ ] **Step 7:** lint + build + test pass. Commit `UI04: plain-language errors and TxButton`.

### Task UI05: Metadata + checkpoint generators (library)

**Files:** create `src/lib/metadata.ts`, `src/lib/metadata.test.ts`, `src/lib/docStore.ts`.

**Interfaces — Produces:**
```ts
export type BatchDoc = { schema: "farmy.batch.v1"; product: string; origin: string; quantity: string; unit: string; harvestDate: string };
export type CheckpointDoc = { schema: "farmy.checkpoint.v1"; batchId: string; weightKg: string; temperatureC: string; location: string; note: string; time: string };
export type FarmyDoc = BatchDoc | CheckpointDoc;
export const PRODUCTS: { name: string; emoji: string; unit: string }[];
export const ORIGINS: string[];
export function canonicalJson(doc: FarmyDoc): string;
export function hashDoc(doc: FarmyDoc): string;                 // 0x + 64 hex (keccak256)
export function batchUri(doc: BatchDoc): string;                // "farmy:keccak256:0x…"
export function hashFromUri(uri: string): string | null;
export function parseDoc(text: string): FarmyDoc | null;
export function productEmoji(product: string): string;          // 📦 if unknown
// docStore.ts (browser only)
export function saveDoc(doc: FarmyDoc): string;                 // returns hash
export function getDoc(hash: string): FarmyDoc | null;
export function downloadDoc(doc: FarmyDoc, fileName: string): void;
```

- [ ] **Step 1: failing test** `src/lib/metadata.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { batchUri, canonicalJson, hashDoc, hashFromUri, parseDoc, productEmoji, type BatchDoc } from "./metadata.ts";

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

test("uri round-trips to the hash", () => {
  assert.equal(hashFromUri(batchUri(doc)), hashDoc(doc));
  assert.equal(hashFromUri("ipfs://demo/tomatoes"), null);
});

test("parseDoc accepts our schemas only", () => {
  assert.deepEqual(parseDoc(canonicalJson(doc)), doc);
  assert.equal(parseDoc('{"schema":"other"}'), null);
  assert.equal(parseDoc("not json"), null);
});

test("product emoji", () => {
  assert.equal(productEmoji("Tomatoes"), "🍅");
  assert.equal(productEmoji("Saffron"), "📦");
});
```
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: implement** `src/lib/metadata.ts`:
```ts
import { keccak256, toUtf8Bytes } from "ethers";

export type BatchDoc = { schema: "farmy.batch.v1"; product: string; origin: string; quantity: string; unit: string; harvestDate: string };
export type CheckpointDoc = { schema: "farmy.checkpoint.v1"; batchId: string; weightKg: string; temperatureC: string; location: string; note: string; time: string };
export type FarmyDoc = BatchDoc | CheckpointDoc;

const KEYS: Record<FarmyDoc["schema"], string[]> = {
  "farmy.batch.v1": ["schema", "product", "origin", "quantity", "unit", "harvestDate"],
  "farmy.checkpoint.v1": ["schema", "batchId", "weightKg", "temperatureC", "location", "note", "time"],
};

export const PRODUCTS = [
  { name: "Tomatoes", emoji: "🍅", unit: "kg" },
  { name: "Grain", emoji: "🌾", unit: "t" },
  { name: "Cattle", emoji: "🐄", unit: "heads" },
  { name: "Olives", emoji: "🫒", unit: "kg" },
  { name: "Citrus", emoji: "🍊", unit: "crates" },
];
export const ORIGINS = ["Sfax", "Nabeul", "Béja", "Kairouan", "Sousse"];

const URI_PREFIX = "farmy:keccak256:";

/** JSON with the schema's key order, so the same data always gives the same hash. */
export function canonicalJson(doc: FarmyDoc): string {
  return JSON.stringify(doc, KEYS[doc.schema]);
}

export function hashDoc(doc: FarmyDoc): string {
  return keccak256(toUtf8Bytes(canonicalJson(doc)));
}

export function batchUri(doc: BatchDoc): string {
  return URI_PREFIX + hashDoc(doc);
}

export function hashFromUri(uri: string): string | null {
  return uri.startsWith(URI_PREFIX) && /^0x[0-9a-f]{64}$/.test(uri.slice(URI_PREFIX.length)) ? uri.slice(URI_PREFIX.length) : null;
}

export function parseDoc(text: string): FarmyDoc | null {
  try {
    const value = JSON.parse(text) as FarmyDoc;
    const keys = KEYS[value?.schema];
    if (!keys || !keys.every((k) => typeof (value as Record<string, unknown>)[k] === "string")) return null;
    return JSON.parse(canonicalJson(value)) as FarmyDoc;
  } catch {
    return null;
  }
}

export function productEmoji(product: string): string {
  return PRODUCTS.find((p) => p.name.toLowerCase() === product.toLowerCase())?.emoji ?? "📦";
}
```
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: docStore.ts** — `localStorage["farmy.docs.v1"]` as `Record<hash, canonicalJson>`; all access in try/catch; `downloadDoc` builds a `Blob` (`application/json`) and clicks a temporary `<a download>`.
- [ ] **Step 6:** lint + build + test pass. Commit `UI05: metadata and checkpoint hash generators`.

### Task UI06: Next-step logic (library)

**Files:** create `src/lib/journey.ts`, `src/lib/journey.test.ts`, `src/lib/journeyData.ts`.

**Interfaces — Produces:**
```ts
export type OpenSale = { id: bigint; seller: string; buyer: string; price: bigint; state: "Created" | "Deposited" };
export type JourneyState = { batchId: bigint; custodian: string; validated: boolean; lastPrice: bigint; sale: OpenSale | null };
export type Who = { kind: "address"; address: string } | { kind: "inspector" } | { kind: "anyone" } | { kind: "notSeller"; seller: string };
export type StepAction = "addCheckpoint" | "validate" | "handOver" | "listForSale" | "cancelListing" | "buy" | "clearListing" | "handToBuyer" | "release" | "refundBuyer" | "refundMe";
export type Step = { action: StepAction; who: Who; primary: boolean };
export function nextSteps(s: JourneyState): Step[];
export function canDo(step: Step, me: string | null, isInspector: boolean): boolean;
export function primaryStep(steps: Step[]): Step | undefined;
// journeyData.ts
export async function loadJourneyState(registry: Contract, escrow: Contract | null, batchId: bigint): Promise<JourneyState>;
export async function loadAllJourneyStates(registry: Contract, escrow: Contract | null): Promise<JourneyState[]>; // newest first
```

- [ ] **Step 1: failing test** `src/lib/journey.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { canDo, nextSteps, primaryStep, type JourneyState } from "./journey.ts";

const farmer = "0xf", seller = "0x5e", buyer = "0xb", other = "0x0";
const base: JourneyState = { batchId: 1n, custodian: farmer, validated: false, lastPrice: 100n, sale: null };
const actions = (s: JourneyState) => nextSteps(s).map((x) => x.action + (x.primary ? "*" : ""));

test("not validated, no sale: inspector validates, holder can hand over", () => {
  assert.deepEqual(actions(base), ["validate*", "addCheckpoint", "handOver"]);
});

test("validated, no sale: holder lists for sale", () => {
  assert.deepEqual(actions({ ...base, validated: true }), ["listForSale*", "handOver"]);
});

test("listed by the holder: others buy, seller cancels", () => {
  const s: JourneyState = { ...base, custodian: seller, validated: true, sale: { id: 1n, seller, buyer: "0x", price: 115n, state: "Created" } };
  assert.deepEqual(actions(s), ["buy*", "cancelListing"]);
  const buy = nextSteps(s)[0];
  assert.equal(canDo(buy, buyer, false), true);
  assert.equal(canDo(buy, seller, false), false);
});

test("listing whose seller lost the goods: anyone clears it", () => {
  const s: JourneyState = { ...base, custodian: other, validated: true, sale: { id: 1n, seller, buyer: "0x", price: 115n, state: "Created" } };
  assert.deepEqual(actions(s), ["clearListing*"]);
});

test("paid, validated, seller still holds the goods: hand to buyer", () => {
  const s: JourneyState = { ...base, custodian: seller, validated: true, sale: { id: 1n, seller, buyer, price: 115n, state: "Deposited" } };
  assert.deepEqual(actions(s), ["handToBuyer*", "refundBuyer", "refundMe"]);
});

test("paid but not validated: inspector validates first, no hand-over yet", () => {
  const s: JourneyState = { ...base, custodian: seller, validated: false, sale: { id: 1n, seller, buyer, price: 115n, state: "Deposited" } };
  assert.deepEqual(actions(s), ["validate*", "addCheckpoint", "refundBuyer", "refundMe"]);
});

test("paid, validated, delivered: release, and the buyer can no longer refund", () => {
  const s: JourneyState = { ...base, custodian: buyer, validated: true, sale: { id: 1n, seller, buyer, price: 115n, state: "Deposited" } };
  assert.deepEqual(actions(s), ["release*", "refundBuyer"]);
  assert.equal(canDo(primaryStep(nextSteps(s))!, other, false), true);
});

test("paid, goods went to someone else: the buyer gets the money back", () => {
  const s: JourneyState = { ...base, custodian: other, validated: true, sale: { id: 1n, seller, buyer, price: 115n, state: "Deposited" } };
  assert.deepEqual(actions(s), ["refundMe*", "refundBuyer"]);
});

test("addresses compare case-insensitively and inspectors are recognized", () => {
  const [validate] = nextSteps(base);
  assert.equal(canDo(validate, "0xABC", true), true);
  assert.equal(canDo(validate, "0xABC", false), false);
  assert.equal(canDo(nextSteps(base)[2], "0xF", false), true);
});
```
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: implement** `src/lib/journey.ts`:
```ts
export type OpenSale = { id: bigint; seller: string; buyer: string; price: bigint; state: "Created" | "Deposited" };
export type JourneyState = { batchId: bigint; custodian: string; validated: boolean; lastPrice: bigint; sale: OpenSale | null };
export type Who = { kind: "address"; address: string } | { kind: "inspector" } | { kind: "anyone" } | { kind: "notSeller"; seller: string };
export type StepAction =
  | "addCheckpoint" | "validate" | "handOver" | "listForSale" | "cancelListing" | "buy"
  | "clearListing" | "handToBuyer" | "release" | "refundBuyer" | "refundMe";
export type Step = { action: StepAction; who: Who; primary: boolean };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const by = (address: string): Who => ({ kind: "address", address });
const step = (action: StepAction, who: Who, primary = false): Step => ({ action, who, primary });

/**
 * What can happen next to a batch, mirroring the contracts' rules so the UI can offer the right button.
 * The contracts still enforce every rule; this only decides what to show.
 */
export function nextSteps(s: JourneyState): Step[] {
  const inspect = (primary: boolean) => [step("validate", { kind: "inspector" }, primary), step("addCheckpoint", { kind: "inspector" })];
  const { sale } = s;

  if (!sale) {
    return s.validated
      ? [step("listForSale", by(s.custodian), true), step("handOver", by(s.custodian))]
      : [...inspect(true), step("handOver", by(s.custodian))];
  }

  if (sale.state === "Created") {
    if (!same(s.custodian, sale.seller)) return [step("clearListing", { kind: "anyone" }, true)];
    return [step("buy", { kind: "notSeller", seller: sale.seller }, true), step("cancelListing", by(sale.seller))];
  }

  const refunds = [step("refundBuyer", by(sale.seller)), step("refundMe", by(sale.buyer))];
  if (s.validated && same(s.custodian, sale.buyer)) return [step("release", { kind: "anyone" }, true), refunds[0]];
  if (!s.validated) return [...inspect(true), ...refunds];
  if (same(s.custodian, sale.seller)) return [step("handToBuyer", by(sale.seller), true), ...refunds];
  return [{ ...refunds[1], primary: true }, refunds[0]];
}

export function canDo(st: Step, me: string | null, isInspector: boolean): boolean {
  if (!me) return false;
  switch (st.who.kind) {
    case "address": return same(st.who.address, me);
    case "inspector": return isInspector;
    case "anyone": return true;
    case "notSeller": return !same(st.who.seller, me);
  }
}

export function primaryStep(steps: Step[]): Step | undefined {
  return steps.find((s) => s.primary);
}
```
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: journeyData.ts** — `loadJourneyState`: `Promise.all([custodianOf, isValidated, getLastPrice, escrow?.openSaleOf(id) ?? 0n])`; if sale id ≠ 0 → `getSale` → `OpenSale` (state 1 → Created, 2 → Deposited). `loadAllJourneyStates`: ids from `BatchMinted` events (newest first).
- [ ] **Step 6:** lint + build + test pass. Commit `UI06: next-step logic for the batch journey`.

### Task UI07: Batches — grid + mint wizard (Person A's folder)

**Files:** create `components/ui/Tag.tsx`; rewrite `features/registry/RegistryHome.tsx`, `BatchList.tsx` (→ grid), `MintBatchForm.tsx` (→ wizard); keep `registry.ts`, `useRegistry.ts`, `useRegistryTx.ts` APIs.

**Interfaces — Consumes:** `usePeople`, `PersonPicker`, `TxButton`/`useContractTx`, `PRODUCTS`, `ORIGINS`, `batchUri`, `saveDoc`, `getDoc`, `hashFromUri`, `productEmoji`. **Produces:** `Tag({ batch: Batch; doc: BatchDoc | null; status: ReactNode; size?: "lg" | "sm" })`.

- [ ] **Step 1: Tag** — kraft card (`bg-kraft text-kraft-ink rounded-lg`), cut top-left corner via `clip-path: polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px)`, punched hole (12px circle `bg-paper` with inset border) top-left, product emoji + name in `font-display`, origin · quantity unit · harvest date, price `font-display text-4xl font-extrabold tabular` with "FRM", "held by" `PersonName`, status chips, shadow per DESIGN_SYSTEM §4. Without doc: "Batch #N" and "Details kept off-chain".
- [ ] **Step 2: Grid** — `BatchGrid({ batches, sales })`: tags (`size="sm"`) as links to `/batch/{id}`, chips: Validated (field) / Not validated (plain), For sale (harvest) / Paid into escrow (harvest), held by. Empty: "No batches yet. Add the first one as 🧑‍🌾 Farmer."
- [ ] **Step 3: Mint wizard** (`AddBatchWizard`, opened by "Add batch") — step 1 product tiles (PRODUCTS + "Other" with name input), step 2 origin chips (ORIGINS + "Other…"), quantity + unit (default from product), harvest date (`<input type="date">`, default today), step 3 price chips 50/100/150 + input, first holder `PersonPicker` (default me), review card shows the generated JSON and the URI. Submit `TxButton label="Add batch" done="Batch added"` → `saveDoc(doc)` then `mintBatch(holder, batchUri(doc), parseUnits(price))`; on success navigate to `/batch/{newId}` (from the `BatchMinted` log) and show "Download details (JSON)".
- [ ] **Step 4: RegistryHome** — title "Batches", `NextStepBanner`, "Add batch" primary button, grid. Regulator drawer (Task UI09) only for the regulator.
- [ ] **Step 5:** lint + build + test pass; browser: add a batch in Demo mode as Farmer, it appears as a tag. Commit `UI07: batch grid and add-batch wizard with generated metadata`.

### Task UI08: Batch journey page

**Files:** create `components/ui/Stamp.tsx`, `features/registry/BatchJourney.tsx`, `features/registry/CheckpointForm.tsx`, `features/payment/SalePanel.tsx`, `src/app/batch/[id]/page.tsx`; delete `BatchDetail.tsx`, `BatchActions.tsx`.

**Interfaces:**
- `BatchJourney({ batchId: bigint; salePanel: (ctx: SaleContext) => ReactNode })` (A) — loads batch + history, renders Tag (lg), "Next step" card, Stamp timeline; registry actions (validate, checkpoint, hand over) handled inside.
- `type SaleContext = { state: JourneyState; steps: Step[]; me: string | null; isInspector: boolean; onDone: () => void }`
- `SalePanel(ctx: SaleContext)` (B) — renders the market steps (listForSale, buy, cancelListing, clearListing, handToBuyer, release, refundBuyer, refundMe) the acting person can do, plus the market part of the timeline via `useSaleHistory(batchId)` returning escrow events for that batch as `HistoryItem`-like entries.
- page: `<BatchJourney batchId={id} salePanel={(ctx) => <SalePanel {...ctx} />} />`

- [ ] **Step 1: Stamp** — 36px round badge with event emoji in the status color ring (`border-2`), title, `PersonName`, block number + time, details line; prop `fresh` adds `.stamp-in`.
- [ ] **Step 2: timeline** — registry events (existing `loadHistory`) + escrow events filtered by the batch's sale ids (`SaleCreated` with `batchId` index, then `Deposited`/`PaymentReleased`/`Refunded` by those sale ids), merged by `(blockNumber, logIndex)`. Titles: 🌱 Added by X · 🤝 Handed to Y · 📋 Checked by Inspector (weight, temp, location when `getDoc(dataHash)` exists) · ✅ Validated · 🏷️ Listed at N FRM · 🔒 Paid into escrow by Buyer · 💸 Payment released · ↩️ Refunded N FRM. `PriceRecorded` merges into the mint and release stamps (not its own stamp).
- [ ] **Step 3: Next step card** — `nextSteps(state)`; steps the acting person can do become buttons (primary first, `Button variant="primary"` only for the primary). Labels: Validate batch · Add checkpoint · Hand over · List for sale · Cancel listing · Buy for N FRM · Clear old listing · Hand goods to <buyer> · Release payment · Cancel and refund buyer · Refund me. If the primary step is not mine: "Waiting for <who>" sentence + in Demo mode "Switch to <person>" (first person matching: address / inspector from `chainRoles` / any non-seller).
- [ ] **Step 4: CheckpointForm** (A) — weight, temperature, location chips (ORIGINS + "Other…"), note; builds `CheckpointDoc` (`time` = now ISO), `saveDoc`, `addCheckpoint(id, hashDoc(doc))`, done "Checkpoint added".
- [ ] **Step 5: Hand over** (A) — `PersonPicker` excluding the holder + `TxButton label="Hand over" done="Handed over"`.
- [ ] **Step 6: SalePanel** (B) — List for sale: `AmountInput` with cap = `priceCap(lastPrice, markup)` and chips At cap / Same price / +10% (clamped to cap), helper "Cap: 120 FRM (last price 100 FRM + 20%)"; button stays enabled over the cap (contract shows the error, DESIGN: warn line in `text-harvest-ink`). Buy: approve if allowance < price, then deposit (existing logic). Hand goods to buyer: `registry.transferCustody(batchId, buyer)`. Release / refund / cancel / clear: `escrow.releasePayment` / `escrow.refund`.
- [ ] **Step 7: Details** — if `hashFromUri(uri)` and `getDoc(hash)` → show the doc on the tag + "Download details"; else "Details kept off-chain" + "Verify a file" (`<input type="file" accept="application/json">`, `parseDoc` + `hashDoc` compare → Chip "Matches" field / "Doesn't match" beet, and when it matches, `saveDoc` so the details show from then on).
- [ ] **Step 8:** Unknown id → "Batch #N doesn't exist." + link "See all batches".
- [ ] **Step 9:** lint + build + test pass; browser walk: validate as Inspector, list as holder, buy as Buyer, hand over, release. Commit `UI08: batch journey with stamps and one next-step panel`.

### Task UI09: Market + admin drawers

**Files:** rewrite `features/payment/MarketHome.tsx`, `SalesList.tsx`, `AuthorityPanel.tsx`; delete `SaleActions.tsx`, `CreateSaleForm.tsx` (moved into `SalePanel`); rewrite `features/registry/RegulatorPanel.tsx`; create `components/ui/Drawer.tsx`.

- [ ] **Step 1: Drawer** — right side sheet (`<dialog>` with `showModal`), title, close button, `Esc` closes.
- [ ] **Step 2: MarketHome** — title "Market", `NextStepBanner`, summary line (your FRM balance, max markup), two sections "Open sales" and "Finished"; each sale row: product emoji + name (from doc), batch #, price, seller → buyer `PersonName`, state Chip, and a link "Open batch" to `/batch/{id}` where the action happens. "Market authority tools" button only for the authority.
- [ ] **Step 3: AuthorityPanel** in drawer — Mint FRM: `PersonPicker` + amount chips 100/500/1000 → `TxButton "Mint FRM" done="FRM minted"`; Max markup: number input + chips 10/20/30 → `"Set max markup" done="Max markup updated"`.
- [ ] **Step 4: RegulatorPanel** in drawer on Batches (regulator only) — Inspectors: list of people with an Inspector toggle (`setInspector(addr, !isInspector)`); Escrow: current escrow address and a button "Use the deployed escrow" (`setEscrow(getDeployment("PriceCapEscrow").address)`), plus "Other address…" via `PersonPicker`-style input.
- [ ] **Step 5:** lint + build + test pass. Commit `UI09: market list and admin drawers`.

### Task UI10: Home, guide, banner, setup card

**Files:** rewrite `src/app/page.tsx` (→ `features/guide/HomeScreen.tsx` shared), create `components/NextStepBanner.tsx`, `components/SetupCard.tsx`, `features/guide/GuideHome.tsx`, `src/app/guide/page.tsx`; delete `components/ConnectionStatus.tsx`.

- [ ] **Step 1: NextStepBanner** — `loadAllJourneyStates`; first batch with a primary step I can do → "Batch #N (🍅 Tomatoes): <step sentence>" + button "Open batch"; else first primary step anyone waits for → "Batch #N waits for <who>" + "Switch to <who>" (Demo mode). Hidden when there are no batches. Setup problems (Ganache down, contracts missing) → beet banner "Ganache isn't reachable…" + link to the guide.
- [ ] **Step 2: Home** — headline "From farm to buyer, at a fair price." with one-sentence explanation; "You are" card (person, role chips from `chainRoles`, FRM balance, "Switch person"); "Your next steps" (all batches' steps I can do, max 5, each a link); latest 3 batch tags; `SetupCard` collapsed to a chip "Everything is connected" / expanded when something is missing.
- [ ] **Step 3: Guide** (sections with anchors and a short in-page index):
  1. Setup — Ganache settings (127.0.0.1:7545, network 5777, chain 1337), `npm run migrate`, Demo mode vs MetaMask, "Add Farmy network" button (`switchToGanache`), importing a Ganache account into MetaMask (Ganache key icon → MetaMask "Import account"; the app never asks for keys).
  2. Meet the people — table from `usePeople` (emoji, name, what they do).
  3. The story — the 8 steps of idea1 §7, numbered (it's a sequence), each with "Act as <person>" and "Go there" link.
  4. The rules — price cap calculator (last price input + markup input → cap), refund rules in 3 bullets.
  5. What errors mean — table from `ERROR_HELP`.
- [ ] **Step 4:** lint + build + test pass. Commit `UI10: home, guide and next-step banner`.

### Task UI11: Verify end to end + docs

- [ ] **Step 1:** `farmy_blockchain`: `npx truffle test --network development` → 99 passing. `npx truffle migrate --reset` + `npm --prefix ../farmy_web run sync-contracts`.
- [ ] **Step 2:** Browser (Demo mode) run of idea1 §7: Farmer adds 🍅 200 kg at 100 FRM → hands to Transporter → Inspector adds checkpoint + validates → Transporter hands to Warehouse → Warehouse lists 150 (sees "above the cap of 120 FRM") → lists 115 → Buyer buys → Warehouse hands goods to Buyer → Release → tag shows 115 FRM, cap for the next sale 138. Then a second batch: list, buy, Cancel and refund buyer.
- [ ] **Step 3:** Check 375px width, dark mode, keyboard focus, no console errors.
- [ ] **Step 4:** Update `README.md` run section (Demo mode), `farmy_blockchain/roadmap-B.md` (tasks UI01–UI11 + Decisions Log entries for every A/shared file and the Demo-mode rule exception), `farmy_blockchain/test_person.md` §5 (now testable in the UI).
- [ ] **Step 5:** Commit `UI11: end-to-end check and docs`.

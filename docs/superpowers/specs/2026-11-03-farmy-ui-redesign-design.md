# Farmy UI redesign — design spec

- **Date:** 2026-11-03
- **Author:** Person B (with Claude), approved in chat by the user
- **Scope:** the whole web app in `farmy_web/` (Person A's `features/registry/`, Person B's `features/payment/`, shared layout and `lib/`). Contracts don't change.
- **Visual rules:** [`farmy_web/DESIGN_SYSTEM.md`](../../../farmy_web/DESIGN_SYSTEM.md)

## 1. Goal
Make the demo usable by someone who has never used a blockchain app:
- no copy-pasting addresses or hashes,
- one obvious button for "what do I do now",
- a built-in guide that explains the story and the rules,
- a friendly, farm-market look.

Contracts stay the only source of truth (rules §2a): the UI pre-checks to explain, the contract decides.

## 2. Decisions taken with the user
| Topic | Decision |
|-------|----------|
| Scope | Whole app. Every A-owned and shared file touched is logged in `roadmap-B.md`; the user tells Person A |
| Addresses | Named demo people (Ganache accounts with role nicknames, renamable, saved in the browser) |
| Metadata | `farmy:keccak256:0x…` on-chain; the JSON is kept in the browser, downloadable, and verifiable by upload |
| Guide | `/guide` page + a "next step" banner on each page |
| Look | Farm market: meadow-paper background, field green, harvest amber, beet red (see design system) |
| Structure | Batch journey: one page per batch with a stamp timeline and one "Next step" panel |
| Demo mode | Yes: act as any Ganache person without MetaMask, chain 1337 only. **Breaks rules.md §2a "MetaMask is the only signer"**; logged, Person A must be told. MetaMask stays available and is the default when installed |

## 3. Pages
| Route | Content |
|-------|---------|
| `/` | "You are" card (person, roles, FRM balance), "Your next steps" list across all batches, latest batches, setup chip (green when Ganache + contracts are up) |
| `/registry` (label "Batches") | Grid of batch tags; "Add batch" opens the mint wizard |
| `/batch/[id]` | Journey: big batch tag + Next step panel (left, sticky on desktop), stamp timeline (right) |
| `/market` | Open sales first, then finished; each card has its main action. Market authority drawer only for the authority |
| `/people` | The 10 demo people: name, role, FRM balance, address with copy, rename, "act as" (demo mode) |
| `/guide` | Setup, meet the people, the 8-step story with "Go there" links, the rules (cap calculator, refund rules), what each error means |

Routes `/registry` and `/market` keep their paths so links in `DEMO.md` and `README.md` stay valid.

Wireframes (desktop; mobile stacks top to bottom in the same order):
```
Header: [Farmy]  Home  Batches  Market  Guide  People        [Acting as: 🚜 Farmer ▾]
────────────────────────────────────────────────────────────────────────────────────
Next step banner: "Batch #1 waits for an inspector. Switch to 🔍 Inspector"  [Switch]

/batch/[id]
┌──────────────────────────┐   ┌───────────────────────────────────────────┐
│ ◯ BATCH TAG (kraft)      │   │ Stamp timeline                            │
│ 🍅 Tomatoes · 200 kg     │   │  ● Added by Farmer        100 FRM         │
│ Sfax · harvested 1 Nov   │   │  ● Handed to Transporter                  │
│ 115 FRM (big)            │   │  ● Checked by Inspector  12 kg · 4 °C     │
│ held by 🛒 Buyer         │   │  ● Validated                              │
├──────────────────────────┤   │  ● Listed at 115 FRM                      │
│ Next step                │   │  ● Paid into escrow by Buyer              │
│ [  Release payment  ]    │   │  ● Handed to Buyer                        │
│ secondary actions        │   │  ● Payment released · new price 115       │
└──────────────────────────┘   └───────────────────────────────────────────┘
```

## 4. Demo people and Demo mode
- `lib/people.ts`: reads Ganache accounts with `eth_accounts` on the read provider (no hardcoded addresses).
- Default names by account index, matching `test/integration/lifecycle.test.js`:
  0 Regulator & market authority · 1 Inspector · 2 Farmer · 3 Transporter · 4 Warehouse · 5 Buyer · 6 Retailer · 7–9 Guest 1–3. Each has an emoji.
- Renames stored in `localStorage` (`farmy.people.v1`); a reset restores defaults. Storage failures fall back to defaults.
- Unknown addresses render as the short address.
- `WalletProvider` gains a `mode: "metamask" | "demo"`:
  - **demo:** `account` is the chosen person; `getSigner()` returns `readProvider.getSigner(address)` (Ganache unlocked accounts). Only offered when the read provider's chain id is 1337. Choice saved in `localStorage`.
  - **metamask:** unchanged behaviour.
- Header shows one control: "Acting as <person> ▾" (demo) or the MetaMask button. Switching person is one click.
- MetaMask's account switch is still needed in metamask mode; the guide explains it.

## 5. Generators (`lib/metadata.ts`)
- **Batch metadata:** wizard fields product (tiles: Tomatoes, Grain, Cattle, Olives, Citrus, Other + free name), origin (presets + free text), quantity + unit (kg, t, heads, crates), harvest date (default today).
  JSON `{ schema: "farmy.batch.v1", product, origin, quantity, unit, harvestDate }` with fixed key order → `keccak256(utf8(json))` → URI `farmy:keccak256:0x…`.
- **Checkpoint data:** weight (kg), temperature (°C), location, note → JSON `{ schema: "farmy.checkpoint.v1", … }` → `keccak256` → the `bytes32 dataHash` for `addCheckpoint`.
- Both JSONs are saved in `localStorage` under their hash (`farmy.docs.v1`). The journey shows details when the hash is known, else "Details kept off-chain" with **Verify a file** (upload JSON, recompute hash, show match / no match) and the JSON gets a **Download** button after creation.
- Old URIs (`ipfs://…`, plain text) are shown as they are.

## 6. Journey and next-step logic
- Timeline merges registry events (`BatchMinted`, `CustodyTransferred`, `CheckpointAdded`, `BatchValidated`, `PriceRecorded`) and escrow events for that batch (`SaleCreated`, `Deposited`, `PaymentReleased`, `Refunded`), sorted by block and log index.
- `lib/journey.ts` is a pure function `nextSteps(state, me) → Step[]`. `state` = batch (custodian, validated, last price) + its open sale + roles; `me` = acting account. Each step has `actor` (who can do it), `label`, `action` id, and `primary` flag. The panel renders the steps where `actor` is me as buttons, and the others as "Waiting for X" with a **Switch to X** button in demo mode.

| State | Me | Steps |
|-------|----|-------|
| not validated | inspector | Add checkpoint, Validate (primary) |
| not validated | holder | Hand over to… ; hint "waiting for an inspector" |
| validated, no open sale | holder | List for sale (primary), Hand over to… |
| Created | seller | Cancel listing |
| Created | anyone else | Buy for X FRM (primary: approve if needed + deposit) |
| Created, seller no longer holds it | anyone | Clear old listing |
| Deposited, custody not with buyer | seller (holder) | Hand goods to <buyer> (primary, one click), Cancel + refund buyer |
| Deposited, conditions met | anyone | Release payment (primary) |
| Deposited, conditions not met | buyer | Refund me |
| Deposited, conditions met | buyer | (no refund button) |

- Price input on "List for sale" shows the cap and chips: **At cap**, **Same price**, **+10%** (each clamped to the cap).
- `lib/errors.ts` maps every custom error of the 3 ABIs to a sentence with values, e.g. `PriceAboveCap(150, 120)` → "This price is above the cap of 120 FRM." Unknown errors fall back to the decoded name.
- After each transaction: toast with the action's past tense ("Listed at 115 FRM"), data refresh through `useChainVersion`.

## 7. Guide
- `/guide` sections: Setup (Ganache, Demo mode vs MetaMask, "Add Farmy network" button, how to import Ganache accounts into MetaMask — the app never asks for keys), Meet the people, The story (idea1 §7 as 8 steps, each with the person to act as and a "Go there" link), The rules (price-cap calculator: last price + markup → cap; refund rules), What errors mean (table from `lib/errors.ts`).
- `NextStepBanner` on Home, Batches, Market and Journey: the single most relevant step for the acting person (first primary step across open batches), or a setup hint when Ganache/contracts are missing.

## 8. Code layout and ownership
| Path | Owner | Content |
|------|-------|---------|
| `src/app/globals.css`, `layout.tsx` | shared | tokens, fonts, header, banner slot |
| `src/app/batch/[id]/page.tsx`, `guide/`, `people/` | shared | thin pages composing features |
| `src/components/ui/*` | shared | Button, TxButton, Card, Chip, PersonPicker, PersonName, AmountInput, Toast, Tag, Stamp |
| `src/lib/people.ts`, `metadata.ts`, `journey.ts`, `errors.ts`, `wallet/*` | shared | logic above |
| `src/features/registry/*` | A | batch grid, mint wizard, journey timeline, inspector + custody actions |
| `src/features/payment/*` | B | market list, sale panel for the journey, authority drawer |

The journey page renders A's `BatchJourney` and passes B's `SalePanel` into its "Next step" area; neither feature imports the other.

## 9. Errors and empty states
- No Ganache / no contracts: full-width setup card linking to the guide, no broken screens.
- Unknown batch id: "Batch #N doesn't exist" + link to Batches.
- Empty lists say what to do: "No batches yet. Add the first one as 🚜 Farmer."
- MetaMask rejection: "You cancelled the transaction in MetaMask."

## 10. Verification
- `farmy_blockchain`: `npx truffle test` stays at 99 passing (contracts untouched).
- `farmy_web`: `npm run lint` and `npm run build` pass.
- In the browser (Demo mode, Ganache): run idea1 §7 end to end — add batch, hand over, checkpoint, validate, list 150 (blocked with a clear message), list 115, buy, hand to buyer, release; plus refund and cancel paths. Check light, dark and 375 px mobile.

## 11. Out of scope
- No contract changes, no real IPFS upload, no new npm dependencies except Google fonts through `next/font`.
- No i18n; English UI.

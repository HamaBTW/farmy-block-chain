# Roadmap B — FarmCoin (FT) + PriceCapEscrow

Owner: **Person B**. Scope: `contracts/payment/`, `test/payment/`, `farmy_web/src/features/payment/`.
Mocks of A's interface live in `contracts/mocks/`. Shared files touched by B are logged in the Decisions Log.

## Current State
- **Date:** 2026-11-03
- **Last completed:** UI11 (whole-app UI redesign, verified end to end in Demo mode)
- **Next task:** none. Tell Person A about the redesign (A-owned + shared files below, Demo-mode rule exception); `DEMO.md` still describes the old screens
- **Branch:** `person-b`, main merged in at 3667ef9 (all A and B tasks); the sync-folder fix (4312a98) is only here until `person-b` is merged to main
- **Open problems:** none. A confirmed the freeze; A11 is done. B11–B16 done by Person A's agent at the user's request (see Decisions Log)
- **Test command:** `npx truffle test --network development` (`truffle` is not installed globally, so `npm test` fails on this machine)

## Tasks

### Phase 0 — Setup
- [x] B00 | Create `roadmap-B.md` | Depends on: A00 | Done when: roadmap committed on `person-b`

### Phase 1 — Shared interface (first, with A)
- [x] B01 | Review A's `IBatchRegistry.sol` draft | Depends on: A01 | Done when: review written in this roadmap and given to the user for A
- [x] B02 | Interface frozen | Depends on: B01, A02 | Done when: A confirms and both roadmaps log "IBatchRegistry v1 frozen"

### Phase 2 — Contracts (each task = code + tests in `test/payment/`)
- [x] B03 | `FarmCoin`: OZ `ERC20("FarmCoin","FRM")` + `Ownable`, `mint(to, amount)` onlyOwner (market authority) | Depends on: - | Done when: name/symbol/decimals, owner mint, non-owner revert, zero-address revert tested
- [x] B04 | `MockBatchRegistry` in `contracts/mocks/` implementing `IBatchRegistry` with test setters | Depends on: A01 | Done when: compiles; setters + 4 interface functions work in a small test
- [x] B05 | `PriceCapEscrow` skeleton: constructor(registry, coin, maxMarkupPercent) with zero-address checks, `Ownable` (owner = market authority), `setMaxMarkup` + `MarkupChanged`, view `maxMarkupPercent()` | Depends on: B03, B04 | Done when: deploy, setMaxMarkup happy/non-owner/event tested
- [x] B06 | `createSale(batchId, price)`: seller must be `custodianOf`, `price > 0`, `price <= lastPrice * (100 + markup) / 100` + `SaleCreated` | Depends on: B04 | Done when: within-cap OK, cap edge (exactly cap) OK, over-cap revert (150 vs cap 120), non-custodian and zero-price reverts, event tested
- [x] B07 | `deposit(saleId)`: buyer pulls `price` FRM via `SafeERC20.safeTransferFrom`, state `Created → Deposited` + `Deposited` | Depends on: B06 | Done when: balances moved, wrong state, no allowance, seller-as-buyer, unknown-sale reverts, event tested
- [x] B08 | `releasePayment(saleId)`: requires `isValidated` and `custodianOf == buyer`; state → `Released`, pays seller, `registry.recordSalePrice`; `nonReentrant`, CEI + `PaymentReleased` | Depends on: B07 | Done when: happy path, not-validated, custody-not-moved, double-release reverts, recorded price, event tested
- [x] B09 | `refund(saleId)` (rule in Decisions Log, approved): state → `Refunded`, FRM back to buyer; `nonReentrant` + `Refunded` | Depends on: B07 | Done when: seller cancel, buyer refund while conditions unmet, buyer blocked once conditions met, double-refund and refund-after-release reverts, event tested
- [x] B10 | Coverage + gas pass | Depends on: B03–B09 | Done when: `npm test` green, gas table pasted in this roadmap, nothing flagged

### Phase 3 — Deploy
- [x] B11 | `migrations/2_deploy_payment.js` (shared): `FarmCoin` → `PriceCapEscrow(registry, coin, 20)` → `registry.setEscrow(escrow)` | Depends on: B10, A11 | Done when: deployed on Ganache, `/` shows both contracts deployed

### Phase 4 — UI (`farmy_web/src/features/payment/`, route `/market`)
- [x] B12 | FRM balance + authority panel (mint FRM, set max markup) | Depends on: B11 | Done when: owner can mint/set markup from MetaMask, others see the revert; `npm run build` passes
- [x] B13 | Sales list (from `SaleCreated`/`Deposited`/... events) + create-sale form with cap pre-check | Depends on: B12 | Done when: listing works; over-cap shows the friendly message and the contract still reverts
- [x] B14 | Buyer flow: approve + deposit | Depends on: B13 | Done when: deposit from MetaMask moves FRM and the sale shows Deposited
- [x] B15 | Release + refund buttons | Depends on: B14 | Done when: both work from MetaMask; blocked cases show the contract revert

### Phase 5 — Integration (after A is done)
- [x] B16 | Integration tests in `test/integration/` (B's part): overpriced sale rejected, refund after cancelled sale | Depends on: B11, A10 | Done when: pass against the real `BatchRegistry` on Ganache (A writes happy path, blocked releases, unauthorized calls)
- [x] B17 | End-to-end demo through the UI (with A's registry screens) | Depends on: B16, A17 | Done when: idea1 §7 lifecycle runs fully from MetaMask

### Phase 6 — UI redesign (whole app, user request; spec `docs/superpowers/specs/2026-11-03-farmy-ui-redesign-design.md`, plan `docs/superpowers/plans/2026-11-03-farmy-ui-redesign.md`)
- [x] UI01 | Design tokens, fonts, UI primitives, `npm test` (node --test) | Depends on: B17 | Done when: lint + build pass
- [x] UI02 | Named demo people, PersonPicker, People page | Depends on: UI01 | Done when: 3 people tests pass, page lists Ganache accounts
- [x] UI03 | Demo mode + header person switcher | Depends on: UI02 | Done when: a Demo-mode transaction is mined without MetaMask
- [x] UI04 | Plain-language errors + TxButton | Depends on: UI01 | Done when: 5 error tests pass
- [x] UI05 | Metadata + checkpoint hash generators | Depends on: UI01 | Done when: 6 metadata tests pass
- [x] UI06 | Next-step logic | Depends on: UI01 | Done when: 10 journey tests pass
- [x] UI07 | Batch grid + Add batch form | Depends on: UI02–UI05 | Done when: batch added from the form shows as a tag
- [x] UI08 | Batch journey page (stamps + Next step) | Depends on: UI06, UI07 | Done when: page shows tag, stamps, right step per person
- [x] UI09 | Market list + admin drawers | Depends on: UI08 | Done when: inspector toggle, mint, markup work from the UI
- [x] UI10 | Home, guide, next-step banner, setup card | Depends on: UI09 | Done when: lint + build pass, banner points to the next step
- [x] UI11 | End-to-end check + docs | Depends on: UI10 | Done when: idea1 §7 runs in Demo mode (150 refused, 115 sold, released, new cap 138, cancel works), 99 contract + 24 UI tests pass

## B01 — Review of `IBatchRegistry.sol` (v1 draft, commit 85a6147)
**Verdict: OK, no changes requested.** Ready to freeze once A confirms.
- `getLastPrice`, `isValidated`, `custodianOf` cover every escrow check (cap, release conditions, seller check).
- `recordSalePrice` with `price > 0` is fine: the escrow never creates zero-price sales.
- `uint256` prices in FRM base units match `FarmCoin` (18 decimals).
- "Reverts for unminted batches" is good: `createSale` on an unknown batch fails inside the registry, so the escrow needs no own existence check.
- Note only (no interface change): A stores `lastPrice` as `uint128`, so the escrow keeps sale prices in `uint96`; both are far above any demo price.

## B10 — Gas report (Ganache, solc 0.8.24, optimizer 200, measured from receipts)
| Call | Gas |
|------|-----|
| deploy FarmCoin | 616,173 |
| deploy PriceCapEscrow | 1,378,797 |
| FarmCoin.mint | 70,708 |
| FarmCoin.approve | 46,383 |
| setMaxMarkup | 29,751 |
| createSale | 106,074 |
| deposit | 73,484 |
| releasePayment (with mock registry) | 78,215 |
| refund, cancel Created | 34,127 |
| refund, Deposited | 46,831 |

Nothing flagged. `createSale` is the most expensive call: 3 new slots (2 for `Sale`, 1 for `_openSaleOf`) + 2 registry reads; that's the minimum for the lock. `releasePayment` with the real registry, re-measured in B16: **79,766** gas (mock: 78,215).
Coverage: every external function of `FarmCoin` and `PriceCapEscrow` has happy path, revert paths, access rule and event tested (59 tests in the whole suite, 0 warnings).

## Decisions Log
- 2026-11-03 | B works on branch `person-b`, from `main` at 14f6d40 | rules §7
- 2026-11-03 | `FarmCoin` = OZ `ERC20` + `Ownable`, only addition is `mint` (onlyOwner); no cap, no burn | Smallest token that fits idea1 ("minted by the market authority")
- 2026-11-03 | Market authority = deployer, owner (`Ownable`) of both `FarmCoin` and `PriceCapEscrow` | Same pattern as A's regulator; no AccessControl needed for one role
- 2026-11-03 | `test/payment/helpers.js` is B's own copy of the custom-error `expectRevert` (same approach as A's) | Don't depend on files B doesn't own
- 2026-11-03 | Planned: `Sale { address seller; SaleState state; uint64 batchId; address buyer; uint96 price; }` = 2 slots; buyer is whoever deposits | Fewer SSTOREs; idea1's `createSale` has no buyer param
- 2026-11-03 | Planned: `createSale` requires `msg.sender == custodianOf(batchId)` | Otherwise anyone could list goods they don't hold
- 2026-11-03 | Approved by user: `refund` = seller may cancel any time before release; buyer may refund only while release conditions are not met | Stops a buyer from keeping goods and money after delivery
- 2026-11-03 | B04: mock reverts `UnknownBatch` for a batch with no custodian and only lets the set escrow call `recordSalePrice` | Behaves like the interface promises, so escrow tests stay valid against the real registry
- 2026-11-03 | Escrow default max markup 20% in the migration | idea1 §7 example (100 → cap 120)
- 2026-11-03 | B05: markup stored as `uint16` (max 65535%), `MarkupChanged(uint16 percent)` also emitted by the constructor | Packs with the sale counter in one slot; event history shows the initial markup too
- 2026-11-03 | B05: `registry()` and `coin()` views on the escrow | UI needs the coin address for `approve`; immutables are cheap to read
- 2026-11-03 | B06: added view `getSale(saleId)` returning the `Sale` struct | UI needs the live state/buyer to show release and refund buttons; events alone don't give current state cheaply
- 2026-11-03 | B06: cap rounds down (`lastPrice * (100 + markup) / 100`) and `price == cap` is allowed | idea1 formula uses `<=`
- 2026-11-03 | B06 (fix): one open (Created/Deposited) sale per batch via `_openSaleOf[batchId]`, plus view `openSaleOf` | Without it one buyer depositing on two sales of the same batch lets the seller be paid twice; costs one SSTORE per sale, refunded on close
- 2026-11-03 | B06 (fix): so a listing can't block a batch forever, a Created sale can be cancelled (via `refund`) by its seller, or by anyone once the seller is no longer custodian | Needed by the lock above; part of B09
- 2026-11-03 | B07: `Deposited(saleId, buyer, price)` carries the price; unknown sale reverts `WrongState(None)` | UI can show locked amounts from events; no separate existence check needed
- 2026-11-03 | B08: `releasePayment` callable by anyone, `nonReentrant`; state + open-sale lock cleared before the FRM transfer and `recordSalePrice` | idea1 lets anyone trigger release once conditions hold; CEI + guard per rules §4
- 2026-11-03 | B08: if the registry rejects `recordSalePrice` the whole release reverts (sale stays Deposited) | Price history and payment must never diverge
- 2026-11-03 | B09: one `refund` function covers cancel (Created, no FRM moved, `amount` 0) and refund (Deposited); both end in `Refunded` | Keeps idea1's function list and the architecture's state machine; no extra `cancelSale`
- 2026-11-03 | B09: known limit: if custody reaches the buyer before validation, the buyer can still refund | Sellers must transfer custody only after validation (idea1 §7 order); documented for the demo
- 2026-11-03 | B10: gas measured with a throwaway receipt script, no gas-reporter dependency added | Rules forbid adding dependencies without need; numbers in the table above
- 2026-11-03 | B15 (by A's agent): Deposited sales show a live ✅/❌ checklist (validated, custody with buyer); Release stays clickable so `NotValidated`/`CustodyNotMoved` reverts are visible; refund shown only to seller ("Cancel + refund buyer") and buyer ("Refund me") | Demo §8 scenarios visible in the UI
- 2026-11-03 | B15 (by A's agent): fixed `useChainVersion`: own listener per effect run (ethers' async `off` removed the shared one under React dev double-mount, so no block polling) | Found while testing live refresh
- 2026-11-03 | B14 (by A's agent): one Buy button runs `approve` (only when allowance < price) then `deposit`, two MetaMask confirmations; hidden for the seller | `deposit` pulls FRM with `safeTransferFrom`, so the allowance must come first
- 2026-11-03 | B13 (by A's agent): the over-cap warning doesn't disable the button, so the contract's `PriceAboveCap` revert is visible in the demo; `priceCap()` mirrors the contract formula (rounds down) | Rules §2a: UI may pre-check, the contract enforces
- 2026-11-03 | B12 (by A's agent): shared `farmy_web/src/lib/tx.ts` (`useContractTx`, `mined`, revert decoding across all 3 ABIs) and `lib/useChainVersion.ts` (refetch on every new block); A's `useRegistryTx` now wraps it | One tx/revert helper for both features; block-based refresh fixes a stale list right after a tx and shows other accounts' actions live
- 2026-11-03 | B16 (by A's agent): B's scenarios (overpriced sale, refund after cancel, plus exact-cap edge and buyer refund blocked after delivery) are in the shared `test/integration/lifecycle.test.js` | One lifecycle file for both people's scenarios
- 2026-11-03 | B11 (by A's agent): added shared `migrations/2_deploy_payment.js`; uses `BatchRegistry.deployed()`, deployer is regulator + market authority, markup 20 | As planned in B11; checked `registry.escrow() == escrow`, `escrow.registry()/coin()` correct
- 2026-11-03 | B02: **IBatchRegistry v1 frozen** (A confirmed; no changes) | Both developers agreed
- 2026-11-03 | Added `test_person.md`: B's manual test guide (Truffle console + mock registry, scenarios S1–S9); every expected output checked by script on Ganache (54/54) | User request; B11+ not testable by hand yet
- 2026-11-03 | Shared file `farmy_web/scripts/sync-contracts.mjs`: `mkdirSync(src/contracts, recursive)` before writing | `npm run migrate` crashed with ENOENT on a fresh clone because `src/contracts/` only holds the git-ignored file. Tell A.
- 2026-11-03 | UI redesign approved by the user: whole app, named demo people, hash metadata (`farmy:keccak256:0x…`, JSON kept in the browser), journey page, guide, farm-market look | User decisions in chat; details in the spec
- 2026-11-03 | **Rule exception (rules.md §2a "MetaMask is the only signer"):** Demo mode signs with Ganache's unlocked accounts through the RPC, only when the chain id is 1337; no keys in the browser; MetaMask still available | User approved; makes the demo usable without importing 6 keys. **Tell Person A**
- 2026-11-03 | Shared files changed by B (tell Person A): `farmy_web/src/app/*` (layout, home, new `batch/[id]`, `guide`, `people`), `src/app/globals.css`, `src/components/*` (new `ui/`, `Header`, `NextStepBanner`, `SetupCard`; removed `WalletButton`, `ConnectionStatus`), `src/lib/*` (new `people`, `metadata`, `docStore`, `errors`, `format`, `journey`, `journeyData`, `useBatchViews`; `wallet/WalletProvider` Demo mode; `tx.ts` friendly errors), `src/features/guide`, `src/features/people`, `tsconfig.json` (`allowImportingTsExtensions`), `package.json` (`test` script), new `DESIGN_SYSTEM.md`, `docs/superpowers/` | Redesign
- 2026-11-03 | **A-owned files changed by B (user approved "whole app"; tell Person A):** `farmy_web/src/features/registry/` rewritten: `RegistryHome`, `RegulatorPanel` (inspector toggles, escrow link); new `BatchGrid`, `AddBatchForm`, `BatchJourney`, `CheckpointForm`; removed `BatchList`, `BatchDetail`, `BatchActions`, `MintBatchForm`, `useRegistryTx`; `registry.ts`/`useRegistry.ts` trimmed to the history loader | Redesign
- 2026-11-03 | Next-step rule: the UI offers "List for sale" only after validation and "Hand goods to buyer" only after validation | Avoids the known refund gap (buyer refunds after early delivery); contracts unchanged
- 2026-11-03 | BigInt literals avoided (`BigInt(…)`) in UI code | `tsconfig` targets ES2017; same idiom as existing code

## Needs From The Other Person
- **B delivered to A:** B01 review above (verdict OK). Tell A so they can freeze (A02)
- **B needs from A:** A02 freeze; deployed `BatchRegistry` (A11) for B11; `getLastPrice`/`isValidated`/`custodianOf`/`recordSalePrice` implemented (A05–A09) for integration (B16)
- **B delivers to A:** deployed `PriceCapEscrow` address and the `registry.setEscrow(escrow)` call in the shared migration (B11)

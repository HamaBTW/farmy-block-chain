# Roadmap B — FarmCoin (FT) + PriceCapEscrow

Owner: **Person B**. Scope: `contracts/payment/`, `test/payment/`, `farmy_web/src/features/payment/`.
Mocks of A's interface live in `contracts/mocks/`. Shared files touched by B are logged in the Decisions Log.

## Current State
- **Date:** 2026-11-03
- **Last completed:** B03 (`FarmCoin`; 6 tests passing, no compiler warnings)
- **Next task:** B04: `MockBatchRegistry` in `contracts/mocks/`
- **Branch:** `person-b` (local only, not pushed), branched from `main` at 14f6d40 (A01–A04 included)
- **Open problems:** A02/B02 freeze waits on A confirming the review below; refund rule (B08) needs user OK

## Tasks

### Phase 0 — Setup
- [x] B00 | Create `roadmap-B.md` | Depends on: A00 | Done when: roadmap committed on `person-b`

### Phase 1 — Shared interface (first, with A)
- [x] B01 | Review A's `IBatchRegistry.sol` draft | Depends on: A01 | Done when: review written in this roadmap and given to the user for A
- [ ] B02 | Interface frozen | Depends on: B01, A02 | Done when: A confirms and both roadmaps log "IBatchRegistry v1 frozen"

### Phase 2 — Contracts (each task = code + tests in `test/payment/`)
- [x] B03 | `FarmCoin`: OZ `ERC20("FarmCoin","FRM")` + `Ownable`, `mint(to, amount)` onlyOwner (market authority) | Depends on: - | Done when: name/symbol/decimals, owner mint, non-owner revert, zero-address revert tested
- [ ] B04 | `MockBatchRegistry` in `contracts/mocks/` implementing `IBatchRegistry` with test setters | Depends on: A01 | Done when: compiles; setters + 4 interface functions work in a small test
- [ ] B05 | `PriceCapEscrow` skeleton: constructor(registry, coin, maxMarkupPercent) with zero-address checks, `Ownable` (owner = market authority), `setMaxMarkup` + `MarkupChanged`, view `maxMarkupPercent()` | Depends on: B03, B04 | Done when: deploy, setMaxMarkup happy/non-owner/event tested
- [ ] B06 | `createSale(batchId, price)`: seller must be `custodianOf`, `price > 0`, `price <= lastPrice * (100 + markup) / 100` + `SaleCreated` | Depends on: B04 | Done when: within-cap OK, cap edge (exactly cap) OK, over-cap revert (150 vs cap 120), non-custodian and zero-price reverts, event tested
- [ ] B07 | `deposit(saleId)`: buyer pulls `price` FRM via `SafeERC20.safeTransferFrom`, state `Created → Deposited` + `Deposited` | Depends on: B06 | Done when: balances moved, wrong state, no allowance, seller-as-buyer, unknown-sale reverts, event tested
- [ ] B08 | `releasePayment(saleId)`: requires `isValidated` and `custodianOf == buyer`; state → `Released`, pays seller, `registry.recordSalePrice`; `nonReentrant`, CEI + `PaymentReleased` | Depends on: B07 | Done when: happy path, not-validated, custody-not-moved, double-release reverts, recorded price, event tested
- [ ] B09 | `refund(saleId)` (rule in Decisions Log, needs user OK): state → `Refunded`, FRM back to buyer; `nonReentrant` + `Refunded` | Depends on: B07 | Done when: seller cancel, buyer refund while conditions unmet, buyer blocked once conditions met, double-refund and refund-after-release reverts, event tested
- [ ] B10 | Coverage + gas pass | Depends on: B03–B09 | Done when: `npm test` green, gas table pasted in this roadmap, nothing flagged

### Phase 3 — Deploy
- [ ] B11 | `migrations/2_deploy_payment.js` (shared): `FarmCoin` → `PriceCapEscrow(registry, coin, 20)` → `registry.setEscrow(escrow)` | Depends on: B10, A11 | Done when: deployed on Ganache, `/` shows both contracts deployed

### Phase 4 — UI (`farmy_web/src/features/payment/`, route `/market`)
- [ ] B12 | FRM balance + authority panel (mint FRM, set max markup) | Depends on: B11 | Done when: owner can mint/set markup from MetaMask, others see the revert; `npm run build` passes
- [ ] B13 | Sales list (from `SaleCreated`/`Deposited`/... events) + create-sale form with cap pre-check | Depends on: B12 | Done when: listing works; over-cap shows the friendly message and the contract still reverts
- [ ] B14 | Buyer flow: approve + deposit | Depends on: B13 | Done when: deposit from MetaMask moves FRM and the sale shows Deposited
- [ ] B15 | Release + refund buttons | Depends on: B14 | Done when: both work from MetaMask; blocked cases show the contract revert

### Phase 5 — Integration (after A is done)
- [ ] B16 | Integration tests in `test/integration/` (B's part): overpriced sale rejected, refund after cancelled sale | Depends on: B11, A10 | Done when: pass against the real `BatchRegistry` on Ganache (A writes happy path, blocked releases, unauthorized calls)
- [ ] B17 | End-to-end demo through the UI (with A's registry screens) | Depends on: B16, A17 | Done when: idea1 §7 lifecycle runs fully from MetaMask

## B01 — Review of `IBatchRegistry.sol` (v1 draft, commit 85a6147)
**Verdict: OK, no changes requested.** Ready to freeze once A confirms.
- `getLastPrice`, `isValidated`, `custodianOf` cover every escrow check (cap, release conditions, seller check).
- `recordSalePrice` with `price > 0` is fine: the escrow never creates zero-price sales.
- `uint256` prices in FRM base units match `FarmCoin` (18 decimals).
- "Reverts for unminted batches" is good: `createSale` on an unknown batch fails inside the registry, so the escrow needs no own existence check.
- Note only (no interface change): A stores `lastPrice` as `uint128`, so the escrow keeps sale prices in `uint96`; both are far above any demo price.

## Decisions Log
- 2026-11-03 | B works on branch `person-b`, from `main` at 14f6d40 | rules §7
- 2026-11-03 | `FarmCoin` = OZ `ERC20` + `Ownable`, only addition is `mint` (onlyOwner); no cap, no burn | Smallest token that fits idea1 ("minted by the market authority")
- 2026-11-03 | Market authority = deployer, owner (`Ownable`) of both `FarmCoin` and `PriceCapEscrow` | Same pattern as A's regulator; no AccessControl needed for one role
- 2026-11-03 | `test/payment/helpers.js` is B's own copy of the custom-error `expectRevert` (same approach as A's) | Don't depend on files B doesn't own
- 2026-11-03 | Planned: `Sale { address seller; SaleState state; uint64 batchId; address buyer; uint96 price; }` = 2 slots; buyer is whoever deposits | Fewer SSTOREs; idea1's `createSale` has no buyer param
- 2026-11-03 | Planned: `createSale` requires `msg.sender == custodianOf(batchId)` | Otherwise anyone could list goods they don't hold
- 2026-11-03 | Proposed (needs user OK before B09): `refund` = seller may cancel any time before release; buyer may refund only while release conditions are not met | Stops a buyer from keeping goods and money after delivery
- 2026-11-03 | Escrow default max markup 20% in the migration | idea1 §7 example (100 → cap 120)

## Needs From The Other Person
- **B delivered to A:** B01 review above (verdict OK). Tell A so they can freeze (A02)
- **B needs from A:** A02 freeze; deployed `BatchRegistry` (A11) for B11; `getLastPrice`/`isValidated`/`custodianOf`/`recordSalePrice` implemented (A05–A09) for integration (B16)
- **B delivers to A:** deployed `PriceCapEscrow` address and the `registry.setEscrow(escrow)` call in the shared migration (B11)

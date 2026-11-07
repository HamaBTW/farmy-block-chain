# Farmy v2 — Farm assets, splittable lots, ETH-backed FarmCoin

Date: 2026-11-08 · Status: approved in chat, waiting for spec review
Why: teacher review of v1. Three requests:

1. FarmCoin needs a **max supply** and a **value against ETH**.
2. NFTs should be **real farm assets** (land, big machines). Produce like olives can't be one NFT, because one harvest goes to many places.
3. When an inspector validates, the batch must show **checked, then validated**.

Decisions taken with the user (2026-11-08):

| Question | Decision |
|----------|----------|
| How do assets relate to produce? | **Land produces lots.** Lots are harvested from a Land NFT, so every lot traces back to its parcel. Machines are NFTs too. |
| How is produce split? | **Child NFTs.** A lot's holder splits it into smaller lots. The parent is closed, and each child keeps the parent and land links. |
| How does FRM get value? | **Buy and sell back at a fixed rate.** Every FRM is backed by ETH held in the FarmCoin contract. |
| What does Validate do? | **Check + validate in one transaction.** The contract no longer validates without a checkpoint record. |

Defaults chosen by Claude (the user may change them before the plan): **max supply 1,000,000 FRM**,
**1 ETH = 1000 FRM**, **land and machines are registered by the regulator** (acting as the land office).

---

## 1. Contracts

### 1.1 `BatchRegistry`: one ERC-721, three kinds

The contract keeps its name and file (`contracts/registry/BatchRegistry.sol`) so the migrations, ABI sync
and imports don't churn. On screen it is called **Farm**.

Every token has a `Kind`:

| Kind | Example | Created by | Function |
|------|---------|------------|----------|
| `Land` | "Olive grove, Sfax, 4 ha" | regulator (`onlyOwner`) | `registerAsset(to, Kind.Land, uri, initialPrice)` |
| `Machine` | "Olive harvester" | regulator (`onlyOwner`) | `registerAsset(to, Kind.Machine, uri, initialPrice)` |
| `Lot` | "1000 kg olives" | holder of a Land token | `harvest(landId, uri, quantity, initialPrice)` |

The rules for every kind are the same as in v1. The custodian is the ERC-721 owner, and inspectors add
checkpoints and validate. The last price is set at creation and then by the escrow on each sale.
**The escrow can sell any kind** under the same price cap.

**Storage** (per token, 2 slots):
- slot 1: `uint128 lastPrice`, `bool validated`, `Kind kind`, `bool closed`, `uint64 landId` (0 for Land/Machine)
- slot 2: `uint64 parentId` (0 unless split from a lot), `uint128 quantity` (0 for Land/Machine)

`quantity` is a whole number in the lot's unit. The unit (kg, t, crates…) lives in the off-chain
metadata, as in v1.

**Functions** (new or changed):

| Function | Who | Rule |
|----------|-----|------|
| `registerAsset(to, kind, uri, initialPrice)` | regulator | `kind` must be Land or Machine (`WrongKind`); price > 0 |
| `harvest(landId, uri, quantity, initialPrice)` | custodian of `landId` | `landId` must be Land (`WrongKind`); caller holds it (`NotCustodian`); quantity > 0 (`ZeroQuantity`); price > 0. The new lot goes to the caller |
| `splitLot(lotId, uint256[] quantities)` | custodian of `lotId` | must be an active Lot; 2–10 parts (`BadSplit`); every part > 0 and the parts add up to the lot's quantity (`BadSplit`). The parent becomes `closed`. Each child is minted to the caller with the same `landId`, `parentId = lotId`, the parent's `validated` flag and the parent's URI. Price is shared **in proportion**: `child = parentPrice × part / quantity`, and the last child gets the rounding remainder, so the parts add up to the parent price exactly |
| `checkAndValidate(id, dataHash)` | inspector | active token; not yet validated (`AlreadyValidated`). Emits `CheckpointAdded` then `BatchValidated` in one transaction. **Replaces `validateBatch`**, which is removed |
| `addCheckpoint(id, dataHash)` | inspector | unchanged, but refuses closed lots |
| `transferCustody(id, to)` | custodian | unchanged, but refuses closed lots |
| views | anyone | `assetInfo(id) → (kind, landId, parentId, quantity, closed)`, `isActive(id)` |

- **Closed lots:** a closed lot can't be transferred (checked in the `_update` override), split,
  checked or validated, all with `LotClosed`. Its history stays readable because it is never burned.
- **Removed:** `mintBatch`, replaced by `registerAsset` and `harvest`.

**Events:** `AssetRegistered(id, kind, to)` for **every** new token (land, machine, harvested lot, split child), `LotHarvested(lotId, landId indexed, quantity)`,
`LotSplit(parentId, childId, quantity)` (one per child), plus the v1 `CustodyTransferred`,
`CheckpointAdded`, `BatchValidated` and `PriceRecorded`. `PriceRecorded` is emitted for every new token,
including each child. `BatchMinted` is removed.

**Errors (new):** `WrongKind`, `NotCustodian`, `ZeroQuantity`, `BadSplit`, `LotClosed`.

### 1.2 `IBatchRegistry` v2

Adds one view: `isActive(uint256 id) → bool`. It returns false only for closed (split) lots. The other four
functions are unchanged. Both people sign off on v2 in the roadmaps' Decisions Logs, as with v1.

### 1.3 `PriceCapEscrow`

The only change is in `createSale`: it reverts `NotActive()` when `!registry.isActive(batchId)`.

Selling a closed lot can't complete because its custody can't move. If a lot is split **while listed**, the
sale stays open and gets cleared with the existing v1 refund rules:
- the seller can cancel it at any time;
- the buyer can take the money back, because the release conditions can never be met.

The cap formula, the state machine and the other functions don't change.

### 1.4 `FarmCoin`: capped and ETH-backed

- `ERC20Capped(maxSupply)` and `ReentrancyGuard`. `maxSupply` is a constructor argument: the migration passes 1,000,000 FRM, and tests pass a small cap because Ganache accounts only hold 100 ETH. **No `Ownable` and no `mint`:** FRM only comes
  from buying.
- `RATE = 1000` (constant): 1 wei buys 1000 FRM base units, so 1 ETH = 1000 FRM.
- `buy()` is payable and mints `msg.value × RATE` to the caller.
  - Reverts `ZeroAmount` for 0 ETH.
  - Reverts `ERC20ExceededCap` (from OpenZeppelin) above the max supply.
- `sell(amount)` is `nonReentrant`.
  - Pays `ethOut = amount / RATE` wei (reverts `ZeroAmount` if that's 0).
  - Burns exactly `ethOut × RATE` from the caller first, then sends `ethOut` with `call`.
  - Reverts `EthTransferFailed` if the send fails.
- **Invariant:** `address(this).balance == totalSupply() / RATE` at all times. There's no `receive()`, so
  stray ETH can't be sent in by mistake.
- Views: `RATE`, `cap()`, `reserve()` (the contract's ETH balance).
- Events: `Bought(buyer, ethIn, frmOut)`, `Sold(seller, frmIn, ethOut)`.

### 1.5 Migrations

- `1_deploy_registry.js`: unchanged.
- `2_deploy_payment.js`: deploys `FarmCoin(1,000,000 FRM)`; the other calls are unchanged.
- Neither migration seeds demo data.

---

## 2. Web app (`farmy_web`)

| Area | Change |
|------|--------|
| Nav | "Batches" → **Farm** (route `/registry` kept) |
| Farm page | Tabs **Land · Machines · Lots**. The regulator gets **Register land / machine** (a drawer with name, place or model, size or year, and first price; the details are hashed like v1 metadata, with schemas `farmy.land.v1` and `farmy.machine.v1`). Closed lots are greyed out under the Lots tab |
| Asset page (`/batch/[id]`) | Tag shows the kind. **Land:** a "Harvest a lot" form for its holder (product, quantity, unit, harvest date, first price) and a list of the lots harvested from it. **Lot:** a **family tree** card (land → parent → this lot → children) and a **Split** form for its holder (2–10 parts, live preview of each part's price) |
| Inspector | **Validate** opens the checkpoint form, and its button reads **Check and validate** (`checkAndValidate`). "Add checkpoint" stays for checks along the way |
| Next-step logic (`lib/journey.ts`) | New steps `harvest` (land holder) and `split` (lot holder, once validated, not listed). A closed lot has no steps and shows "Split into #6, #7". Land and machines follow the same validate → list rules as lots |
| Market | A **Wallet** card for everyone: buy FRM with ETH (ETH input, FRM preview), sell FRM for ETH, ETH and FRM balances, and a supply bar (*used / 1,000,000*) with the ETH reserve. Market authority tools keep **Max markup** only; **Mint FRM is removed** |
| Errors (`lib/errors.ts`) | Plain sentences for `WrongKind`, `NotCustodian`, `ZeroQuantity`, `BadSplit`, `LotClosed`, `NotActive`, `ZeroAmount`, `ERC20ExceededCap`, `EthTransferFailed` |
| Guide, home | New story (below); the "people" jobs mention land and machines |

Demo mode is unchanged. Demo people pay with Ganache's 100 test ETH each.

---

## 3. The new demo story

0. 🏛️ Regulator: make the Inspector an inspector, then register **Land "Olive grove, Sfax"** to the Farmer at 5000 FRM.
1. 🛒 Buyer: **buy 1000 FRM for 1 ETH** on the Market.
2. 🚜 Farmer: open the land and **harvest 1000 kg of olives** at 1000 FRM.
3. 🚜 Farmer: hand the lot to the Transporter.
4. 🔍 Inspector: **Check and validate** (998 kg · 4 °C · Sfax → 📋 Checked, then ✅ Validated).
5. 🚚 Transporter: hand the lot to the Warehouse.
6. 🏬 Warehouse: **split into 600 kg + 400 kg**. This creates lots #3 (600 FRM) and #4 (400 FRM), both validated and linked to the land.
7. 🏬 Warehouse: list #3 at 800, which is **refused (cap 720)**, then list it at 700.
8. 🛒 Buyer: buy it for 700 FRM. 🏬 Warehouse: hand #3 to the Buyer. Release: the Warehouse is paid, and the new last price of #3 is 700 (cap 840).
9. Optional: 🛒 Buyer sells FRM back for ETH, and the reserve goes down.

---

## 4. Tests

- **Registry**
  - `registerAsset`: kinds, owner only, `WrongKind`.
  - `harvest`: land holder only, `WrongKind`, `ZeroQuantity`, links.
  - `splitLot`: 2/10/11 parts, a bad sum, proportional prices with remainder, inherited validation, closed parent refuses transfer, split, check and list.
  - `checkAndValidate`: both events in order, inspector only, `AlreadyValidated`.
  - `isActive`; the v1 tests are kept and adapted.
- **FarmCoin**
  - `buy`: rate, cap edge, 0 ETH.
  - `sell`: ETH returned, rounding, 0, more than the balance.
  - The reserve invariant after mixed buys and sells.
  - A reentrancy attempt through a test-only attacker contract in `contracts/mocks/`.
  - No `mint` function exists.
- **Escrow:** `NotActive` for closed lots; the existing tests use `buy()` instead of `mint`. `MockBatchRegistry` gains `isActive`.
- **Integration:** the full §3 story, plus: split while listed → buyer refund; selling a Land token; FRM sold back after a sale.
- **UI unit tests** (`node --test`): journey steps for land, closed lots and split; split price preview; new error sentences.
- **End to end:** §3 played in Demo mode in the browser.

## 5. Docs

- **Roadmaps:** a new Phase 7 in both, plus the v2 freeze in both Decisions Logs.
- **README:** test counts and the progress table.
- **`farmy_idea1.md`:** a v2 note.
- **`DEMO.md`:** rewritten last, after the story runs.
- **`architecture.md`:** kinds, split and the ETH reserve.

## 6. Out of scope

ERC-1155 or ERC-3525 tokens, merging lots, a changeable ETH rate, linking machines to harvests, partial
sales of a lot without splitting first, and burning tokens.

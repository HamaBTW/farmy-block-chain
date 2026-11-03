# Roadmap A — BatchRegistry (NFT)

Owner: **Person A**. Scope: `contracts/registry/`, `test/registry/`, `farmy_web/src/features/registry/`.
Shared files touched by A are logged in the Decisions Log.

## Current State
- **Date:** 2026-11-03
- **Last completed:** A16 (+B16): `test/integration/lifecycle.test.js`, 9 scenarios on the real contracts; full suite 99 passing
- **Next task:** A17: end-to-end demo through the UI (after B12–B15 market screens)
- **Branch:** init committed on `main` (b44652a); A works on `person-a` (local only, not pushed)
- **Open problems:** none

## Tasks

### Phase 0 — Setup
- [x] A00 | Project init (toolchain, folders, web app, docs) | Depends on: - | Done when: `truffle compile` runs, `farmy_web` `npm run build` + `npm run lint` pass, the UI reads Ganache

### Phase 1 — Shared interface (first, with B)
- [x] A01 | Draft `IBatchRegistry.sol`: `getLastPrice`, `isValidated`, `custodianOf`, `recordSalePrice` + NatSpec, prices `uint256` in FRM base units | Depends on: - | Done when: compiles with no warnings and is committed for B to review
- [x] A02 | Interface agreed with B (apply review, freeze) | Depends on: A01 | Done when: B confirms in writing and both roadmaps log "IBatchRegistry v1 frozen"

### Phase 2 — BatchRegistry contract (each task = code + tests in `test/registry/`)
- [x] A03 | Skeleton: `BatchRegistry is ERC721URIStorage, Ownable`, storage layout (packed `Batch` struct), constructor | Depends on: A01 | Done when: compiles, deploy test passes, `name()`/`symbol()`/`owner()` tested
- [x] A04 | Admin: `setInspector(addr, bool)`, `setEscrow(addr)` (onlyOwner, zero-address checks) | Depends on: A03 | Done when: happy path, non-owner revert and zero-address revert tested
- [x] A05 | `mintBatch(to, metadataURI, initialPrice)` + `tokenURI` + `BatchMinted` + first `PriceRecorded` | Depends on: A04 | Done when: mint, URI, initial price, events, zero-address and zero-price reverts tested
- [x] A06 | `transferCustody(batchId, newCustodian)` + `custodianOf` + `CustodyTransferred` | Depends on: A05 | Done when: only current custodian can transfer; revert paths and event tested
- [x] A07 | `addCheckpoint(batchId, dataHash)` (inspector only, event-only storage) | Depends on: A04 | Done when: event args tested; non-inspector and unknown-batch reverts tested
- [x] A08 | `validateBatch(batchId)` + `isValidated` + `BatchValidated` | Depends on: A05 | Done when: inspector validates; non-inspector, unknown batch and double-validation reverts tested
- [x] A09 | `recordSalePrice(batchId, price)` (onlyEscrow) + `getLastPrice` + `PriceRecorded`; contract now declares `is IBatchRegistry` | Depends on: A04, A05, A06, A08 | Done when: test account set as escrow can record; any other caller reverts; event tested; compiles against draft v1 of the interface
- [x] A09b | Re-check `BatchRegistry` against the frozen interface (apply any B change) | Depends on: A02 | Done when: compiles with no warnings against frozen `IBatchRegistry.sol`, `npm test` green
- [x] A10 | Coverage + gas pass: every external function has happy/revert/access/event tests; gas report reviewed | Depends on: A03–A09 | Done when: `npm test` green, gas table pasted in this roadmap, nothing flagged

### Phase 3 — Deploy
- [x] A11 | `migrations/1_deploy_registry.js` (shared) + `npm run migrate` syncs to UI | Depends on: A10 | Done when: deployed on Ganache, `/` shows "BatchRegistry deployed ✅"

### Phase 4 — UI (`farmy_web/src/features/registry/`)
- [x] A12 | Batch list + detail (reads `custodianOf`, `isValidated`, `getLastPrice`, `tokenURI`; history from events) | Depends on: A11 | Done when: works on Ganache, `npm run build` passes
- [x] A13 | Mint batch form (MetaMask-signed) | Depends on: A12 | Done when: mint from MetaMask shows up in the list
- [x] A14 | Custody transfer + inspector actions (add checkpoint, validate) | Depends on: A12 | Done when: each action works from MetaMask; unauthorized accounts see the contract revert message
- [x] A15 | Regulator panel: set inspector, set escrow | Depends on: A12 | Done when: owner can set both from the UI; other accounts are refused

### Phase 5 — Integration (after B is done)
- [x] A16 | Integration tests in `test/integration/` for idea §8 scenarios: happy path, release blocked (not validated), release blocked (custody not moved), unauthorized `recordSalePrice`/validate/checkpoint | Depends on: A11, B's escrow done | Done when: all pass on Ganache (B writes the overpriced-sale and refund scenarios)
- [!] A17 | End-to-end demo through the UI (with B's market screens) | Depends on: A16 | Done when: section 7 lifecycle of idea1 runs fully from MetaMask | Blocked: needs A16 and B's market screens

## Gas Report (A10, solc 0.8.24, optimizer 200 runs, Ganache)

| Method | Avg gas | Notes |
|--------|---------|-------|
| deploy `BatchRegistry` | 1,618,773 | 24% of block limit |
| `mintBatch` | 138,476 | Most expensive: NFT mint (~50k) + price slot (22k) + URI string (~44k for 2 slots). ⚠️ A `bytes32` metadata hash instead of a URI string would save ~20–40k per mint; kept because idea1 names the parameter `metadataURI` |
| `transferCustody` | 56,560 | Same as plain `transferFrom` (57,160) plus the `CustodyTransferred` event |
| `setEscrow` | 43,704 | |
| `setInspector` | 42,280 | |
| `recordSalePrice` | 32,835 | |
| `validateBatch` | 32,748 | |
| `addCheckpoint` | 28,284 | Event only, no storage |

Run it with `npm run test:gas`.

## Decisions Log
- 2026-11-03 | solc pinned to 0.8.24 with `evmVersion: "paris"` + optimizer (shared `truffle-config.js`) | Ganache 7 rejects push0/mcopy
- 2026-11-03 | OpenZeppelin pinned to 5.0.2 | 5.1+ uses `mcopy`, which doesn't compile for paris
- 2026-11-03 | MetaCoin sample removed; empty folder layout from rules §2 created | Clean start
- 2026-11-03 | Web UI allowed (rules.md §2a), in `farmy_web/` next to `farmy_blockchain/` | User decision
- 2026-11-03 | Confirmed by user: custodian = ERC-721 `ownerOf`, so custody isn't stored twice; `transferCustody` wraps the transfer and emits `CustodyTransferred` | Gas rule: don't store derivable data
- 2026-11-03 | Confirmed by user: roles = `Ownable` (owner = regulator) + `mapping(address => bool)` inspectors + one `_escrow` address, not AccessControl | Smaller bytecode and gas; matches idea's 3 roles
- 2026-11-03 | A03: base is `ERC721URIStorage` (OZ) for `metadataURI`, not a hand-made mapping | Rules: don't re-implement standards
- 2026-11-03 | A03: `Batch { uint128 lastPrice; bool validated; }` in one slot; prices downcast with SafeCast when written (max ~3.4e20 FRM) | One SSTORE per batch instead of two
- 2026-11-03 | A03: batch ids start at 1 (`_lastBatchId` pre-incremented) | id 0 never exists, so 0 can mean "none"
- 2026-11-03 | A03: `is IBatchRegistry` moved to A09 | Inheriting it earlier makes the contract abstract and undeployable until all 4 functions exist
- 2026-11-03 | A16: one shared file `test/integration/lifecycle.test.js` covers A's and B's scenarios (B16 included) plus "price can't keep rising" (115 → cap 138) | B hadn't written B16; user asked A's agent to cover B's gaps
- 2026-11-03 | A02: **IBatchRegistry v1 frozen** (file unchanged since 85a6147); B01 review: OK, no changes | Both developers agreed
- 2026-11-03 | User decision: Person A's agent also does B's unfinished B11–B16 for the demo, and logs it in roadmap-B | B stopped at B10; demo needs deployment + market UI
- 2026-11-03 | A15: the regulator panel checks one address at a time with `isInspector` instead of listing all inspectors | `setInspector` has no events (A04), and there's no on-chain list
- 2026-11-03 | A14: action forms show to every connected account with a role hint instead of being hidden, so the contract's revert (`NotInspector`, `ERC721IncorrectOwner`) is visible | Demo §8: unauthorized addresses are rejected on-chain, not only in the UI
- 2026-11-03 | A14: the checkpoint form builds a JSON record (weight, temp, location, time), shows it to keep off-chain, and sends only `keccak256(record)` | Rules: big data off-chain, `bytes32` on-chain
- 2026-11-03 | A13: added `.input` style to shared `farmy_web/src/app/globals.css` | Reusable form style for both feature folders
- 2026-11-03 | A13: `useRegistryTx` decodes custom errors by searching the wallet error for revert bytes (MetaMask nests them in `data.data`, Ganache in `data.result`) | ethers alone showed "missing revert data"
- 2026-11-03 | A13: UI writes tested with Playwright and a test-only `window.ethereum` stand-in that forwards to Ganache's unlocked accounts; not in app code | Can't drive the real MetaMask extension from automation
- 2026-11-03 | A12: the batch list comes from `BatchMinted` events (no ERC721Enumerable); list and detail are on one `/registry` page with no new routes | No extra on-chain storage; shared `src/app/` routing untouched
- 2026-11-03 | A11: added shared `migrations/1_deploy_registry.js` (deploy only, no demo roles) | Inspectors and escrow are set by the regulator (UI panel A15) and B's migration
- 2026-11-03 | A10: added dev dependency `eth-gas-reporter@0.2.27`, opt-in through `GAS_REPORT=1` in shared `truffle-config.js` (`npm run test:gas`) | Rules §6 asks for a gas report; opt-in keeps `npm test` fast
- 2026-11-03 | A09: split off A09b (re-check against frozen interface) | A02 review not done yet; rule 11 (split instead of claiming frozen)
- 2026-11-03 | A09: `recordSalePrice` checks `NotEscrow` first, then `ZeroPrice`, then batch exists; while no escrow is set nobody can call it | Cheapest revert first; `_escrow == 0` never matches `msg.sender`
- 2026-11-03 | A08: validation is one-way (no un-validate) and survives custody transfers | idea1 has no revoke; escrow reads it at release time
- 2026-11-03 | A07: checkpoints are event-only `CheckpointAdded(batchId, inspector, dataHash)`; timestamp comes from the block; no zero-hash check | Gas rule: history read off-chain only; no extra checks beyond idea1
- 2026-11-03 | A06: `CustodyTransferred` emitted from an `_update` override for every non-mint transfer, so plain `transferFrom`/approved operators are also logged | Custody history in events is always complete
- 2026-11-03 | A06: `transferCustody` reuses OZ `_transfer(msg.sender, …)` checks (`ERC721IncorrectOwner`, `ERC721InvalidReceiver`, `ERC721NonexistentToken`); no custom `NotCustodian` | Rules: don't duplicate OZ checks
- 2026-11-03 | A05: `mintBatch` is open to anyone (the farmer) | idea1 has no minter role; inspector validation guards quality
- 2026-11-03 | A05: no own zero-address check in `mintBatch`; OZ `_mint` reverts `ERC721InvalidReceiver` | Rules: don't duplicate OZ checks
- 2026-11-03 | A05: `_mint` not `_safeMint` | No receiver callback, so cheaper and no reentrancy path; custodians are EOAs
- 2026-11-03 | A05: `BatchMinted(batchId, farmer)` has no URI/price; price is in `PriceRecorded`, URI via `tokenURI` | Avoid duplicate event data
- 2026-11-03 | A04: added views `isInspector(address)` and `escrow()` | UI needs them to show inspector actions and the regulator panel (A14, A15); not in the interface
- 2026-11-03 | A04: no events for `setInspector`/`setEscrow` | idea1 lists only 5 events; rules forbid "just in case" events
- 2026-11-03 | A04: `test/registry/helpers.js` `expectRevert(promise, "Error(sig)")` matches the custom error selector | Truffle can't decode custom errors (shows "could not decode")
- 2026-11-03 | A03: deployer (`msg.sender`) becomes regulator | Simplest; ownership can be transferred with OZ `transferOwnership`
- 2026-11-03 | A01: added shared `contracts/interfaces/IBatchRegistry.sol` (v1 draft): only the 4 functions B needs, no events/errors (those belong to BatchRegistry); every function reverts for unminted batches; prices `uint256` FRM base units; `recordSalePrice` requires price > 0 | Smallest surface B can code against

## Needs From The Other Person
- **Waiting on B now:** review `contracts/interfaces/IBatchRegistry.sol` (on branch `person-a`) and reply OK or with changes
- **A delivers to B:** `IBatchRegistry.sol` (A01), deployed `BatchRegistry` address via migration (A11), `setEscrow` call in the shared migration once B's escrow deploys
- **For B's migration:** write `migrations/2_deploy_payment.js`: `const registry = await BatchRegistry.deployed()`, deploy FarmCoin and `PriceCapEscrow(registry.address, coin.address)`, then `await registry.setEscrow(escrow.address)` from the deployer (the regulator)
- **A needs from B:** review of `IBatchRegistry.sol` (A02); deployed `PriceCapEscrow` for integration (A16)
- **Tell B now:** shared files changed in init: `truffle-config.js`, `rules.md`, `migrations/` (emptied), `farmy_web/` created

# Roadmap A — BatchRegistry (NFT)

Owner: **Person A**. Scope: `contracts/registry/`, `test/registry/`, `farmy_web/src/features/registry/`.
Shared files touched by A are logged in the Decisions Log.

## Current State
- **Date:** 2026-11-03
- **Last completed:** A06 (`transferCustody` + `custodianOf` + `CustodyTransferred`; 22 tests passing)
- **Next task:** A07: `addCheckpoint` (inspector only, event-only storage)
- **Branch:** init committed on `main` (b44652a); A works on `person-a` (local only, not pushed)
- **Open problems:** waiting on B's review of `IBatchRegistry.sol` (A02)

## Tasks

### Phase 0 — Setup
- [x] A00 | Project init (toolchain, folders, web app, docs) | Depends on: - | Done when: `truffle compile` runs, `farmy_web` `npm run build` + `npm run lint` pass, the UI reads Ganache

### Phase 1 — Shared interface (first, with B)
- [x] A01 | Draft `IBatchRegistry.sol`: `getLastPrice`, `isValidated`, `custodianOf`, `recordSalePrice` + NatSpec, prices `uint256` in FRM base units | Depends on: - | Done when: compiles with no warnings and is committed for B to review
- [ ] A02 | Interface agreed with B (apply review, freeze) | Depends on: A01 | Done when: B confirms in writing and both roadmaps log "IBatchRegistry v1 frozen"

### Phase 2 — BatchRegistry contract (each task = code + tests in `test/registry/`)
- [x] A03 | Skeleton: `BatchRegistry is ERC721URIStorage, Ownable`, storage layout (packed `Batch` struct), constructor | Depends on: A01 | Done when: compiles, deploy test passes, `name()`/`symbol()`/`owner()` tested
- [x] A04 | Admin: `setInspector(addr, bool)`, `setEscrow(addr)` (onlyOwner, zero-address checks) | Depends on: A03 | Done when: happy path, non-owner revert and zero-address revert tested
- [x] A05 | `mintBatch(to, metadataURI, initialPrice)` + `tokenURI` + `BatchMinted` + first `PriceRecorded` | Depends on: A04 | Done when: mint, URI, initial price, events, zero-address and zero-price reverts tested
- [x] A06 | `transferCustody(batchId, newCustodian)` + `custodianOf` + `CustodyTransferred` | Depends on: A05 | Done when: only current custodian can transfer; revert paths and event tested
- [ ] A07 | `addCheckpoint(batchId, dataHash)` (inspector only, event-only storage) | Depends on: A04 | Done when: event args tested; non-inspector and unknown-batch reverts tested
- [ ] A08 | `validateBatch(batchId)` + `isValidated` + `BatchValidated` | Depends on: A05 | Done when: inspector validates; non-inspector, unknown batch and double-validation reverts tested
- [ ] A09 | `recordSalePrice(batchId, price)` (onlyEscrow) + `getLastPrice` + `PriceRecorded`; contract now declares `is IBatchRegistry` | Depends on: A02, A04, A05, A06, A08 | Done when: test account set as escrow can record; any other caller reverts; event tested; compiles against the frozen interface
- [ ] A10 | Coverage + gas pass: every external function has happy/revert/access/event tests; gas report reviewed | Depends on: A03–A09 | Done when: `npm test` green, gas table pasted in this roadmap, nothing flagged

### Phase 3 — Deploy
- [ ] A11 | `migrations/1_deploy_registry.js` (shared) + `npm run migrate` syncs to UI | Depends on: A10 | Done when: deployed on Ganache, `/` shows "BatchRegistry deployed ✅"

### Phase 4 — UI (`farmy_web/src/features/registry/`)
- [ ] A12 | Batch list + detail (reads `custodianOf`, `isValidated`, `getLastPrice`, `tokenURI`; history from events) | Depends on: A11 | Done when: works on Ganache, `npm run build` passes
- [ ] A13 | Mint batch form (MetaMask-signed) | Depends on: A12 | Done when: mint from MetaMask shows up in the list
- [ ] A14 | Custody transfer + inspector actions (add checkpoint, validate) | Depends on: A12 | Done when: each action works from MetaMask; unauthorized accounts see the contract revert message
- [ ] A15 | Regulator panel: set inspector, set escrow | Depends on: A12 | Done when: owner can set both from the UI; other accounts are refused

### Phase 5 — Integration (after B is done)
- [ ] A16 | Integration tests in `test/integration/` for idea §8 scenarios: happy path, release blocked (not validated), release blocked (custody not moved), unauthorized `recordSalePrice`/validate/checkpoint | Depends on: A11, B's escrow done | Done when: all pass on Ganache (B writes the overpriced-sale and refund scenarios)
- [ ] A17 | End-to-end demo through the UI (with B's market screens) | Depends on: A16 | Done when: section 7 lifecycle of idea1 runs fully from MetaMask

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
- **A needs from B:** review of `IBatchRegistry.sol` (A02); deployed `PriceCapEscrow` for integration (A16)
- **Tell B now:** shared files changed in init: `truffle-config.js`, `rules.md`, `migrations/` (emptied), `farmy_web/` created

# Roadmap A — BatchRegistry (NFT)

Owner: **Person A**. Scope: `contracts/registry/`, `test/registry/`, `farmy_web/src/features/registry/`.
Shared files touched by A are logged in the Decisions Log.

## Current State
- **Date:** 2026-11-03
- **Last completed:** A00 (project init: Truffle toolchain pinned, folder layout, Next.js app `farmy_web/`, architecture.md)
- **Next task:** A01: draft `contracts/interfaces/IBatchRegistry.sol` and get Person B's review
- **Branch:** init is on `main` (uncommitted); A's work goes on `person-a`
- **Open problems:** none

## Tasks

### Phase 0 — Setup
- [x] A00 | Project init (toolchain, folders, web app, docs) | Depends on: - | Done when: `truffle compile` runs, `farmy_web` `npm run build` + `npm run lint` pass, the UI reads Ganache

### Phase 1 — Shared interface (first, with B)
- [ ] A01 | Draft `IBatchRegistry.sol`: `getLastPrice`, `isValidated`, `custodianOf`, `recordSalePrice` + NatSpec, prices `uint256` in FRM base units | Depends on: - | Done when: compiles with no warnings and is committed for B to review
- [ ] A02 | Interface agreed with B (apply review, freeze) | Depends on: A01 | Done when: B confirms in writing and both roadmaps log "IBatchRegistry v1 frozen"

### Phase 2 — BatchRegistry contract (each task = code + tests in `test/registry/`)
- [ ] A03 | Skeleton: `BatchRegistry is ERC721, Ownable, IBatchRegistry`, custom errors, storage layout (packed `Batch` struct), constructor | Depends on: A02 | Done when: compiles, deploy test passes, `name()`/`symbol()`/`owner()` tested
- [ ] A04 | Admin: `setInspector(addr, bool)`, `setEscrow(addr)` (onlyOwner, zero-address checks) | Depends on: A03 | Done when: happy path, non-owner revert and zero-address revert tested
- [ ] A05 | `mintBatch(to, metadataURI, initialPrice)` + `tokenURI` + `BatchMinted` + first `PriceRecorded` | Depends on: A04 | Done when: mint, URI, initial price, events, zero-address and zero-price reverts tested
- [ ] A06 | `transferCustody(batchId, newCustodian)` + `custodianOf` + `CustodyTransferred` | Depends on: A05 | Done when: only current custodian can transfer; revert paths and event tested
- [ ] A07 | `addCheckpoint(batchId, dataHash)` (inspector only, event-only storage) | Depends on: A04 | Done when: event args tested; non-inspector and unknown-batch reverts tested
- [ ] A08 | `validateBatch(batchId)` + `isValidated` + `BatchValidated` | Depends on: A05 | Done when: inspector validates; non-inspector, unknown batch and double-validation reverts tested
- [ ] A09 | `recordSalePrice(batchId, price)` (onlyEscrow) + `getLastPrice` + `PriceRecorded` | Depends on: A04, A05 | Done when: test account set as escrow can record; any other caller reverts; event tested
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
- 2026-11-03 | Proposal for A03 (confirm before coding): custodian = ERC-721 `ownerOf`, so custody isn't stored twice; `transferCustody` wraps the transfer and emits `CustodyTransferred` | Gas rule: don't store derivable data

## Needs From The Other Person
- **A delivers to B:** `IBatchRegistry.sol` (A01), deployed `BatchRegistry` address via migration (A11), `setEscrow` call in the shared migration once B's escrow deploys
- **A needs from B:** review of `IBatchRegistry.sol` (A02); deployed `PriceCapEscrow` for integration (A16)
- **Tell B now:** shared files changed in init: `truffle-config.js`, `rules.md`, `migrations/` (emptied), `farmy_web/` created

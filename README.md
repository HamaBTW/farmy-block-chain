# Farmy Mini

Chain of custody for agricultural batches (NFT) plus a price-cap escrow (FT), on a local Ganache chain.
All assets are **simulated**. There are no real goods or payments.

| Doc | What |
|-----|------|
| [farmy_idea1.md](farmy_idea1.md) | The product idea and demo scenarios |
| [rules.md](rules.md) | Team and coding rules (read first) |
| [architecture.md](architecture.md) | How the contracts and the web app fit together |
| [farmy_blockchain/configuration.md](farmy_blockchain/configuration.md) | Ganache, MetaMask and Truffle setup |
| [farmy_blockchain/roadmap-A.md](farmy_blockchain/roadmap-A.md) | Person A tasks (BatchRegistry) |
| [DEMO.md](DEMO.md) | **5–7 min teacher demo script** + simple explanation + likely questions |
| [manual-test-A.md](manual-test-A.md) | Person A manual test checklist (contract + UI with MetaMask) |
| [farmy_blockchain/roadmap-B.md](farmy_blockchain/roadmap-B.md) | Person B tasks (FarmCoin + PriceCapEscrow) |

## Quick start

Prerequisites: Node 22, Truffle 5.11, Ganache GUI on `127.0.0.1:7545` (network 5777, chain 1337), MetaMask.

```bash
cd farmy_blockchain && npm install && npm test   # contract tests on Ganache
npm run migrate                                  # deploy + sync ABIs into farmy_web
cd ../farmy_web && npm install && npm run dev    # http://localhost:3000
```

## Progress — Person A (BatchRegistry)

| Task | Status | What |
|------|--------|------|
| A00 | ✅ | Project init: toolchain, folders, Next.js app, docs |
| A01 | ✅ | `IBatchRegistry.sol` draft |
| A02 | ✅ | Interface reviewed by Person B (OK, no changes): **v1 frozen** |
| A03–A09 | ✅ | `BatchRegistry` contract: mint, custody, checkpoints, validation, sale price |
| A09b | ✅ | Re-checked against frozen interface (90 tests in full suite) |
| A10 | ✅ | Coverage + gas report (41 tests, `npm run test:gas`) |
| A11 | ✅ | Registry migration (`npm run migrate`) |
| A12 | ✅ | UI: batch list + detail with event history (`/registry`) |
| A13 | ✅ | UI: mint form (MetaMask-signed, shows decoded revert reasons) |
| A14 | ✅ | UI: custody transfer, add checkpoint, validate (with role hints) |
| A15 | ✅ | UI: regulator panel (grant/revoke inspector, set escrow) |
| A16 | ✅ | Integration tests: 9 scenarios with A + B contracts (`test/integration/`) |
| A17 | ✅ | End-to-end demo through the UI (see [DEMO.md](DEMO.md)) |

✅ done · ⏳ waiting on someone · ⬜ todo · ⛔ blocked

## Progress — Person B (FarmCoin + PriceCapEscrow)

| Task | Status | What |
|------|--------|------|
| B00–B01 | ✅ | Roadmap + interface review (OK, no changes) |
| B02 | ✅ | Interface v1 frozen |
| B03–B10 | ✅ | `FarmCoin` + `PriceCapEscrow` (cap, deposit, release, refund), mock registry, gas pass |
| B11 | ✅ | Payment migration (FarmCoin, escrow at 20%, `setEscrow`) * |
| B12–B15 | ✅ | UI `/market`: balance, authority panel, sales, cap pre-check, buy, release, refund * |
| B16–B17 | ✅ | Integration tests + end-to-end demo * |

\* done by Person A's agent at the user's request; see the Decisions Log in [roadmap-B.md](farmy_blockchain/roadmap-B.md). Person B's manual tests: [test_person.md](farmy_blockchain/test_person.md).

## Tests

```bash
cd farmy_blockchain && npm test   # 99 passing: registry 41 + payment 49 + integration 9
```

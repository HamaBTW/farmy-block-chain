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
| `farmy_blockchain/roadmap-B.md` | Person B tasks (FarmCoin + PriceCapEscrow) |

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
| A02 | ⏳ | Interface review by Person B |
| A03–A09 | ✅ | `BatchRegistry` contract: mint, custody, checkpoints, validation, sale price |
| A09b | ⏳ | Re-check against frozen interface (after A02) |
| A10 | ✅ | Coverage + gas report (41 tests, `npm run test:gas`) |
| A11 | ✅ | Registry migration (`npm run migrate`) |
| A12 | ✅ | UI: batch list + detail with event history (`/registry`) |
| A13 | ✅ | UI: mint form (MetaMask-signed, shows decoded revert reasons) |
| A14 | ✅ | UI: custody transfer, add checkpoint, validate (with role hints) |
| A15 | ⬜ | UI: regulator panel |
| A16 | ⬜ | Integration tests (needs B's escrow) |
| A17 | ⬜ | End-to-end demo (needs B's escrow) |

✅ done · ⏳ waiting on someone · ⬜ todo · ⛔ blocked

## Progress — Person B (FarmCoin + PriceCapEscrow)

See `farmy_blockchain/roadmap-B.md` (maintained by Person B).

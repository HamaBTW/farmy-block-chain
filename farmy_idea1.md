# Farmy Mini — Chain of Custody + Price-Cap Escrow

A mini version of Farmy focused only on blockchain and smart contracts. Two developers, two independent contracts, one NFT and one FT, linked through a clean interface.

## 1. Goal

Track agricultural goods through a supply chain (farmer → transporter → warehouse → retailer), validate them at each step, and make sure the price cannot keep rising along the chain.

## 2. Team Split

| | Person A | Person B |
|---|---|---|
| Token type | NFT (ERC-721) | FT (ERC-20) |
| Contract | `BatchRegistry` | `FarmCoin` + `PriceCapEscrow` |
| Source of truth for | Physical reality: who holds the goods, were they validated, last declared price | Money and rules: balances, escrow, max markup |
| Admins | Inspectors, regulators | Market authority |

## 3. Person A — `BatchRegistry` (NFT)

Each real-world batch (a cow, a crate of tomatoes, a grain lot) is one NFT.

**Stores**
- Batch metadata reference (type, origin, quantity, off-chain URI or hash)
- Current custodian
- Append-only list of checkpoints (weight, temperature, location hash, timestamp, inspector)
- Validation flag
- Last declared price (append-only price history)

**Functions**
- `mintBatch(to, metadataURI, initialPrice)`
- `transferCustody(batchId, newCustodian)`
- `addCheckpoint(batchId, dataHash)`
- `validateBatch(batchId)` (inspector only)
- `recordSalePrice(batchId, price)` (callable only by the escrow contract)
- `getLastPrice(batchId)` (view)
- `isValidated(batchId)` (view)
- `custodianOf(batchId)` (view)

**Roles**
- `owner/regulator`: manages inspectors and the authorized escrow address
- `inspector`: adds checkpoints and validates
- `custodian`: transfers custody

**Events**
- `BatchMinted`, `CustodyTransferred`, `CheckpointAdded`, `BatchValidated`, `PriceRecorded`

## 4. Person B — `FarmCoin` + `PriceCapEscrow` (FT)

**FarmCoin (ERC-20)**
- Standard fungible payment token (`FRM`)
- Minted by the market authority for the demo

**PriceCapEscrow**
- Holds buyer payment until delivery conditions are met
- Enforces: `salePrice <= lastDeclaredPrice * (100 + maxMarkupPercent) / 100`

**Functions**
- `createSale(batchId, price)` (seller; reverts if price exceeds the cap)
- `deposit(saleId)` (buyer locks FRM in escrow)
- `releasePayment(saleId)` (requires `isValidated` true and custody moved to buyer)
- `refund(saleId)` (buyer, if conditions are not met or the sale is cancelled)
- `setMaxMarkup(percent)` (market authority only)

**Events**
- `SaleCreated`, `Deposited`, `PaymentReleased`, `Refunded`, `MarkupChanged`

## 5. How the Two Contracts Talk

```
PriceCapEscrow  ──reads──▶  IBatchRegistry.getLastPrice(batchId)
PriceCapEscrow  ──reads──▶  IBatchRegistry.isValidated(batchId)
PriceCapEscrow  ──reads──▶  IBatchRegistry.custodianOf(batchId)
PriceCapEscrow  ──writes─▶  IBatchRegistry.recordSalePrice(batchId, price)
```

The registry never calls the escrow. The escrow depends on the registry through an interface only.

## 6. Why They Cannot Be Merged

- A knows the physical world and has no balances or money logic.
- B knows money and rules and knows nothing about trucks or inspections.
- Different admins, different state, different reasons to change.
- B cannot work without A's `isValidated`, `getLastPrice` and `custodianOf`. A cannot enforce price control without B. Removing either one removes a whole function of the system.

## 7. Sale Lifecycle

1. Farmer mints batch NFT with initial price (100 FRM).
2. Transporter receives custody, inspector adds checkpoints.
3. Inspector validates the batch.
4. Warehouse lists the sale at 150 FRM. **Escrow rejects it** (cap is 120 with 20% markup).
5. Warehouse lists at 115 FRM. Accepted.
6. Buyer deposits 115 FRM into escrow.
7. Custody moves to the buyer and validation is confirmed. Payment is released to the seller.
8. Registry records 115 as the new last price.

## 8. Demo Scenarios

- Happy path: mint → validate → sale within cap → payment released
- Overpriced sale is rejected
- Release blocked because the batch is not validated
- Release blocked because custody has not moved
- Refund after a cancelled sale
- Unauthorized address cannot validate, mint a checkpoint, or call `recordSalePrice`

## 9. Tooling

- Solidity, Truffle (compile, migrate, test), Ganache (local chain), MetaMask (wallet)
- Sample assets only, clearly labelled as simulated

## 10. Out of Scope

- 3D game client, marketplace UI, real legal ownership, real payments
- Off-chain verification process (documented as manual)

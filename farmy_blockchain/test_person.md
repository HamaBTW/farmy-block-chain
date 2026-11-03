# Manual Test — Person B (FarmCoin + PriceCapEscrow)

How to check B's work by hand on Ganache. Covers tasks B03–B10 (contracts only).
The deploy script (B11) and the `/market` UI (B12–B15) don't exist yet, so everything here runs in the
**Truffle console** against `MockBatchRegistry`, a test-only stand-in for A's registry.

Lines marked `// → x` show what the console should print.

## 0. Before you start
1. Ganache GUI is running on `127.0.0.1:7545` (network id 5777).
2. In `farmy_blockchain/`, dependencies are installed:
   ```bash
   npm install
   ```
3. `truffle` is not installed globally on this machine, so every command uses `npx truffle`.

## 1. Automated tests (run these first)
```bash
npx truffle test test/payment/FarmCoin.test.js test/payment/MockBatchRegistry.test.js test/payment/PriceCapEscrow.test.js --network development
```
Expected: **49 passing**, 0 failing, no compiler warnings.
(`Cannot find module '../binaries/uws_win32_x64_127.node'` is a harmless Ganache notice.)

Whole project (A + B):
```bash
npx truffle test --network development
```
Expected: **59 passing**.

## 2. Open the console and deploy
```bash
npx truffle compile
```
```bash
npx truffle console --network development
```
Paste these lines one by one into the console (each is one line on purpose).

Accounts: `authority` = market authority (owner), `seller` = warehouse, `buyer`, `other` = a stranger.
```js
let [authority, seller, buyer, other] = await web3.eth.getAccounts()
let registry = await MockBatchRegistry.new()
let coin = await FarmCoin.new({ from: authority })
let escrow = await PriceCapEscrow.new(registry.address, coin.address, 20, { from: authority })
await registry.setEscrow(escrow.address)
```

Helpers (show balances in FRM, sale state by name, and the custom error a call reverts with):
```js
let frm = (n) => web3.utils.toWei(String(n), "ether")
let bal = async (a) => web3.utils.fromWei(await coin.balanceOf(a), "ether")
let STATES = ["None", "Created", "Deposited", "Released", "Refunded"]
let state = async (id) => STATES[(await escrow.getSale(id)).state]
let ERRORS = ["ZeroAddress()", "ZeroPrice()", "NotCustodian()", "PriceAboveCap(uint256,uint256)", "BatchAlreadyListed(uint256)", "WrongState(uint8)", "SellerCannotBuy()", "NotValidated()", "CustodyNotMoved()", "NotAllowed()", "ReleaseConditionsMet()", "NotEscrow()", "UnknownBatch(uint256)", "OwnableUnauthorizedAccount(address)", "ERC20InvalidReceiver(address)", "ERC20InsufficientAllowance(address,uint256,uint256)", "ERC20InsufficientBalance(address,uint256,uint256)"]
let why = async (p) => { try { await p; return "OK (no revert)" } catch (e) { const d = e.data?.result ?? e.data; const s = typeof d === "string" ? d.slice(0, 10) : ""; return ERRORS.find((x) => web3.eth.abi.encodeFunctionSignature(x) === s) ?? e.message } }
```
`why(...)` exists because Truffle prints custom errors as "could not decode"; it returns the error name instead.

If you paste a `let` line twice the console says "already declared". Close it (`.exit`) and start again from this section.

## 3. Scenarios

### S1 — FarmCoin (B03)
```js
await coin.name()                                             // → 'FarmCoin'
await coin.symbol()                                           // → 'FRM'
(await coin.decimals()).toString()                            // → '18'
await coin.owner() === authority                              // → true
await why(coin.mint(other, frm(1), { from: other }))          // → 'OwnableUnauthorizedAccount(address)'
await why(coin.mint("0x0000000000000000000000000000000000000000", frm(1), { from: authority }))   // → 'ERC20InvalidReceiver(address)'
await coin.mint(buyer, frm(500), { from: authority })
await bal(buyer)                                              // → '500'
```

### S2 — Max markup (B05)
```js
(await escrow.maxMarkupPercent()).toString()                  // → '20'
await why(escrow.setMaxMarkup(50, { from: other }))           // → 'OwnableUnauthorizedAccount(address)'
await escrow.setMaxMarkup(10, { from: authority })
(await escrow.maxMarkupPercent()).toString()                  // → '10'
await escrow.setMaxMarkup(20, { from: authority })
```

### S3 — Overpriced sale is rejected (idea §8, B06)
Batch 1: last price 100 FRM, held by `seller`, not validated yet. Cap at 20% = 120.
```js
await registry.setBatch(1, frm(100), false, seller)
await why(escrow.createSale(1, frm(150), { from: seller }))   // → 'PriceAboveCap(uint256,uint256)'
await why(escrow.createSale(1, frm(115), { from: other }))    // → 'NotCustodian()'
await why(escrow.createSale(1, 0, { from: seller }))          // → 'ZeroPrice()'
await why(escrow.createSale(99, frm(100), { from: seller }))  // → 'UnknownBatch(uint256)'
let tx = await escrow.createSale(1, frm(115), { from: seller })
let s1 = tx.logs[0].args.saleId.toString()
s1                                                            // → '1'
tx.logs[0].event                                              // → 'SaleCreated'
await state(s1)                                               // → 'Created'
await why(escrow.createSale(1, frm(110), { from: seller }))   // → 'BatchAlreadyListed(uint256)'
```

### S4 — Happy path + both blocked releases (idea §7 and §8, B07–B08)
```js
await why(escrow.deposit(s1, { from: seller }))               // → 'SellerCannotBuy()'
await why(escrow.deposit(s1, { from: buyer }))                // → 'ERC20InsufficientAllowance(address,uint256,uint256)'
await coin.approve(escrow.address, frm(115), { from: buyer })
tx = await escrow.deposit(s1, { from: buyer })
tx.logs[0].event                                              // → 'Deposited'
await state(s1)                                               // → 'Deposited'
await bal(buyer)                                              // → '385'
await bal(escrow.address)                                     // → '115'
await why(escrow.releasePayment(s1))                          // → 'NotValidated()'
await registry.setValidated(1, true)
await why(escrow.releasePayment(s1))                          // → 'CustodyNotMoved()'
await registry.setCustodian(1, buyer)
tx = await escrow.releasePayment(s1, { from: other })
tx.logs[0].event                                              // → 'PaymentReleased'
await state(s1)                                               // → 'Released'
await bal(seller)                                             // → '115'
await bal(escrow.address)                                     // → '0'
web3.utils.fromWei(await registry.getLastPrice(1), "ether")  // → '115'
await why(escrow.releasePayment(s1))                          // → 'WrongState(uint8)'
await why(escrow.refund(s1, { from: buyer }))                 // → 'WrongState(uint8)'
```
The new cap is based on 115: 115 × 1.2 = 138.
```js
await why(escrow.createSale(1, frm(139), { from: buyer }))    // → 'PriceAboveCap(uint256,uint256)'
```

### S5 — Refund after a cancelled sale (idea §8, B09)
Batch 2: 100 FRM, held by `seller`.
```js
await registry.setBatch(2, frm(100), false, seller)
tx = await escrow.createSale(2, frm(110), { from: seller })
let s2 = tx.logs[0].args.saleId.toString()
await coin.approve(escrow.address, frm(110), { from: buyer })
await escrow.deposit(s2, { from: buyer })
await bal(buyer)                                              // → '275'
await why(escrow.refund(s2, { from: other }))                 // → 'NotAllowed()'
tx = await escrow.refund(s2, { from: seller })
tx.logs[0].event                                              // → 'Refunded'
web3.utils.fromWei(tx.logs[0].args.amount, "ether")          // → '110'
await state(s2)                                               // → 'Refunded'
await bal(buyer)                                              // → '385'
await why(escrow.refund(s2, { from: seller }))                // → 'WrongState(uint8)'
await why(escrow.releasePayment(s2))                          // → 'WrongState(uint8)'
```

### S6 — Buyer refund rules (B09)
Batch 3: the buyer can take the money back while delivery isn't done, but not after.
```js
await registry.setBatch(3, frm(100), false, seller)
tx = await escrow.createSale(3, frm(100), { from: seller })
let s3 = tx.logs[0].args.saleId.toString()
await coin.approve(escrow.address, frm(100), { from: buyer })
await escrow.deposit(s3, { from: buyer })
await registry.setValidated(3, true)
await registry.setCustodian(3, buyer)
await why(escrow.refund(s3, { from: buyer }))                 // → 'ReleaseConditionsMet()'
await registry.setCustodian(3, seller)
await escrow.refund(s3, { from: buyer })
await state(s3)                                               // → 'Refunded'
await bal(buyer)                                              // → '385'
```

### S7 — Cancel a listing nobody paid for (B09)
Batch 4: the seller cancels; then a stale listing is cleared by a stranger.
```js
await registry.setBatch(4, frm(100), false, seller)
tx = await escrow.createSale(4, frm(100), { from: seller })
let s4 = tx.logs[0].args.saleId.toString()
await why(escrow.refund(s4, { from: other }))                 // → 'NotAllowed()'
tx = await escrow.refund(s4, { from: seller })
web3.utils.fromWei(tx.logs[0].args.amount, "ether")          // → '0'
(await escrow.openSaleOf(4)).toString()                       // → '0'
tx = await escrow.createSale(4, frm(100), { from: seller })
let s5 = tx.logs[0].args.saleId.toString()
await registry.setCustodian(4, other)
await escrow.refund(s5, { from: other })
await state(s5)                                               // → 'Refunded'
```

### S8 — Only the escrow can record a price (idea §8)
```js
await why(registry.recordSalePrice(1, frm(1), { from: other })) // → 'NotEscrow()'
```
This checks the mock. The same rule in A's real `BatchRegistry` is tested in A16.

### S9 — Event history
```js
(await escrow.getPastEvents("SaleCreated", { fromBlock: 0 })).length       // → 5
(await escrow.getPastEvents("PaymentReleased", { fromBlock: 0 })).length   // → 1
(await escrow.getPastEvents("Refunded", { fromBlock: 0 })).length          // → 4
(await escrow.getPastEvents("MarkupChanged", { fromBlock: 0 })).length     // → 3
```

Leave the console with `.exit`.

## 4. Checklist
| # | What | Pass? |
|---|------|-------|
| 1 | `npx truffle test` (payment files) shows 49 passing | ☐ |
| S1 | FarmCoin: name/symbol/decimals, only the authority mints | ☐ |
| S2 | Only the authority changes the markup | ☐ |
| S3 | 150 rejected, 115 accepted, non-custodian/zero/unknown/second listing rejected | ☐ |
| S4 | Deposit locks FRM; release blocked (not validated, custody not moved); release pays seller and records 115 | ☐ |
| S5 | Seller cancels a paid sale, buyer gets the FRM back, no second refund or release | ☐ |
| S6 | Buyer can't refund after delivery, can before | ☐ |
| S7 | Unpaid listing cancelled by seller, stale listing cleared by anyone | ☐ |
| S8 | Stranger can't call `recordSalePrice` | ☐ |
| S9 | Events recorded | ☐ |

## 5. Not testable yet
- Deploy with `npm run migrate` and the "deployed ✅" status on `/` → B11, waits on A11.
- MetaMask flows on `/market` (mint, list, approve + deposit, release, refund) → B12–B15.
- Against A's real `BatchRegistry` → B16 integration tests.

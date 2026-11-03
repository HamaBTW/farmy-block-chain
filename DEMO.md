# Farmy Mini — Teacher Demo (5–7 min)

A click-by-click script to show everything we built: a box of tomatoes travels from the farmer to the
shop, it gets checked on the way, and it's sold without the price being allowed to explode.

---

## Part 1 — Explained simply (read this first)

Imagine **one crate of tomatoes** 🍅.

| Real world | In our project | Simple picture |
|------------|----------------|----------------|
| The crate | an **NFT** (`BatchRegistry`, Person A) | A **passport** for this one crate. Only one exists, and everybody can read it |
| Who is holding the crate | the NFT owner (**custodian**) | Whoever has the passport in their pocket is holding the crate |
| The inspector checking it | `addCheckpoint` + `validateBatch` | A **doctor's stamp** on the passport: "checked, healthy" ✅ |
| Money | **FarmCoin (FRM)**, an ERC-20 token (Person B) | **Play money** tokens. Fake, only for the demo |
| Paying safely | **PriceCapEscrow** (Person B) | A **robot piggy bank**. The buyer puts the money in, and the robot only gives it to the seller when the crate is stamped ✅ **and** in the buyer's hands |
| No price gouging | the **price cap** (+20% max) | A rule: "you can resell for at most 20% more than the last price". Bought at 100? Max 120. 150 is refused |

**The tools**

| Tool | Simple picture |
|------|----------------|
| **Ganache** | A pretend blockchain running on our laptop. Free fake ETH, instant blocks |
| **Truffle** | The toolbox: it compiles our Solidity code, sends it to Ganache (`migrate`) and runs the tests |
| **MetaMask** | Our wallet. It holds each person's keys and pops up to ask "do you want to sign this?" |
| **Next.js website** | The screens. It **reads** the blockchain directly, and every **write** goes through MetaMask |

**Why two contracts, not one?**
The **registry** (A) knows the *physical world*: who holds the crate, was it checked, what was its last
price. The **escrow** (B) knows *money and rules*: balances, deposits, the 20% cap.
They talk through one small "plug", the interface `IBatchRegistry`, with 4 functions. The registry
never calls the escrow; the escrow only reads it, plus **one** write, `recordSalePrice`, which only the
escrow is allowed to call.

**The golden rule we demo:** the website can *warn* you, but the **smart contract decides**. Every
"no" you'll see comes from the blockchain, not from the website.

---

## Part 2 — Prepare before the teacher arrives (not timed)

1. **Ganache GUI** is running: RPC `127.0.0.1:7545`, network ID `5777`.
2. **MetaMask has 6 accounts**, imported from Ganache (🔑 → copy private key → MetaMask → *Import account*) and **renamed**:

   | MetaMask name | Ganache index | Address (check yours) |
   |---------------|---------------|-----------------------|
   | Regulator | 0 | `0x6B34…87ac` (also the market authority) |
   | Inspector | 1 | `0x11d8…8512` |
   | Farmer | 2 | `0xA01B…3b6A` |
   | Transporter | 3 | `0x98D4…46F5` |
   | **Warehouse** | **4** | `0x2fE3…Ede71` ← import this one too |
   | **Retailer** | **5** | `0x80A0…446F` ← and this one |

   All on the **Farmy** network (chain ID 1337).
3. Fresh deploy and start the site:
   ```bash
   cd farmy_blockchain && npm run migrate
   ```
   ```bash
   cd ../farmy_web && npm run dev
   ```
4. If MetaMask ever shows `nonce too high`/`nonce too low`: MetaMask → Settings → Advanced → **Clear activity tab data** (for each account).
5. **Setup clicks (as Regulator)**, so the live demo stays short:
   - `/registry` → 🏛️ Regulator → paste the **Inspector** address → **Grant** → "Currently: inspector ✓"
   - `/market` → 🏦 Market authority → *Mint FRM to* = **Retailer** address, amount `1000` → **Mint FRM**
6. Run the tests once and keep the terminal open for the last scene:
   ```bash
   cd farmy_blockchain && npm test
   ```
   → **99 passing**. This doesn't touch your demo deployment: `npm test` deploys its own throwaway copies.
7. Keep a notepad with the 6 addresses ready to copy-paste.

> Rejected actions show their red error **instantly, without a MetaMask pop-up**. The contract refuses
> during MetaMask's "dry run" (gas estimate), so nothing is sent and no gas is spent.

---

## Part 3 — The live script (≈ 6 min)

Say the **💬 lines** out loud; do the **🖱️ lines**.

### Scene 1 — What we built (0:00 → 0:45)
🖱️ Open http://localhost:3000 as **Regulator**.
💬 "This is Farmy Mini: we follow a crate of tomatoes from farmer to shop on a blockchain. Person A
built the **BatchRegistry**, an NFT for each crate: who holds it, was it checked, last price. Person B
built **FarmCoin**, our play money, and the **PriceCapEscrow**, which holds payments and forbids more
than +20% markup. Everything runs on Ganache, a local blockchain; Truffle deployed it, and MetaMask
signs every action."
🖱️ Point at **Connection status**: all ✅ (Ganache, MetaMask, chain 1337, 3 contracts deployed).

### Scene 2 — The farmer creates the crate's passport (0:45 → 1:45)
🖱️ MetaMask → **Farmer**. Go to **Batches**.
🖱️ *Mint a batch*: metadata `ipfs://demo/tomatoes-crate-01`, price `100` → **Mint batch** → confirm.
💬 "The farmer mints NFT **#1**, declared at **100 FRM**. Big data like photos stays off-chain: we only store a link."
🖱️ Point at the detail: Custodian = Farmer, History 🌱 Minted, 💰 Price recorded 100.
🖱️ Click **Validate** (under ✅ Validate batch).
💬 "The farmer tries to approve their own tomatoes…" → red **`Reverted: NotInspector()`**. "…the
**contract** refuses: only an inspector can validate. The website even warned us in orange, but the
blockchain is what enforces it."

### Scene 3 — Transport and inspection (1:45 → 2:45)
🖱️ Still Farmer: *Transfer custody* → paste **Transporter** → **Transfer** → confirm.
💬 "Handing over the crate = moving the NFT. History shows 🚚 Farmer → Transporter."
🖱️ MetaMask → **Inspector** (the **inspector** badge appears). Click batch **#1**.
🖱️ *Add checkpoint*: weight `120`, temp `4`, location `Sfax` → **Add checkpoint** → confirm.
💬 "Only a **hash** of this record goes on-chain (32 bytes, cheap); the full record stays off-chain,
but anyone can prove it wasn't changed."
🖱️ **Validate** → confirm → badge **✓ validated**, History ✅ Validated.

### Scene 4 — To the warehouse (2:45 → 3:15)
🖱️ MetaMask → **Transporter** → batch #1 → *Transfer custody* → **Warehouse** → **Transfer** → confirm.
💬 "The crate arrives at the warehouse. Every step is a permanent, timestamped event."

### Scene 5 — The price cap (3:15 → 4:15) ⭐
🖱️ MetaMask → **Warehouse** → **Market**.
🖱️ *Sell a batch*: Batch `1` → the page shows **"Last price 100 FRM · max markup 20% → cap 120 FRM"**.
🖱️ Price `150` → orange warning → click **List for sale** anyway.
💬 "The warehouse wants 150. The escrow asks the registry for the last price, computes 100 × 1.2 =
120, and says no." → **`Reverted: PriceAboveCap(150…, 120…)`** ("those are 150 and 120 with 18 decimals").
🖱️ Price `115` → **List for sale** → confirm → **Sale #1 · Created · 115 FRM**.

### Scene 6 — The buyer pays into the robot piggy bank (4:15 → 5:15)
🖱️ MetaMask → **Retailer**. Balance **1000 FRM**.
🖱️ Sale #1 → **Buy: approve + deposit 115.0 FRM** → confirm **twice** (1: allow the escrow to take 115 FRM, 2: deposit).
💬 "The money is now locked in the escrow, not with the seller." → balance **885 FRM**, sale **Deposited**.
🖱️ Point at the checklist: ✅ validated, ❌ goods handed to the buyer. Click **Release payment to seller**.
💬 "Can the seller get paid already? No: the buyer doesn't have the crate yet." → **`Reverted: CustodyNotMoved()`**.

### Scene 7 — Delivery and payment (5:15 → 6:15)
🖱️ MetaMask → **Warehouse** → **Batches** → #1 → *Transfer custody* → **Retailer** → **Transfer** → confirm.
🖱️ MetaMask → **Retailer** → **Market** → the checklist turns ✅ ✅ by itself → **Release payment to seller** → confirm → **Released**.
💬 "Both conditions are true, so the escrow pays the warehouse and tells the registry: the new last price is 115."
🖱️ MetaMask → **Warehouse** → balance **115 FRM**.
🖱️ *Sell a batch*: Batch `1` → **cap 138 FRM** (= 115 × 1.2).
💬 "And the cap moved with it: the next seller can ask at most 138. The price can't keep climbing along the chain."
🖱️ Optional: **Batches** → #1 → History tells the whole story: Minted → Custody → Checkpoint → Validated → Custody → Custody → Price recorded 115.

### Scene 8 — Quality (6:15 → 7:00)
🖱️ Show the terminal with `npm test` → **99 passing** (41 registry, 49 payment, 9 integration).
💬 "Every function has tests for the happy path, every revert, every access rule and every event. The
integration tests replay the scenarios with both real contracts. We kept gas low: one storage slot per
batch, checkpoints as events only, custom errors. Payments use OpenZeppelin's SafeERC20 and
ReentrancyGuard, and the sale is a strict state machine: Created → Deposited → Released or Refunded."

---

## If you're running late
- Skip **Scene 4**: in Scene 3 the Farmer transfers custody straight to the **Warehouse** (and the Inspector still validates).
- Skip the History walk in Scene 7.

## If something goes wrong
| Symptom | Fix |
|---------|-----|
| Red error says `missing revert data` or `execution reverted` | It's still the contract refusing; explain the rule in words |
| MetaMask `nonce too high` / stuck | Settings → Advanced → Clear activity tab data, then retry |
| A page didn't update | It refreshes on every new block (~4 s); otherwise reload the page |
| "not deployed" on the home page | Ganache was restarted: `npm run migrate`, redo Part 2 step 5 |

---

## Likely teacher questions (short answers)

- **Why an NFT for a batch?** Each crate is unique, so it's non-fungible. Owning the NFT = holding the goods, so custody can't be faked or duplicated.
- **Why an ERC-20 for money?** FRM coins are interchangeable (fungible), like real money.
- **What stops someone from calling `recordSalePrice` and faking a price?** Only the escrow address set by the regulator may call it (`NotEscrow()` for everyone else, including the regulator).
- **What if the buyer never receives the goods?** The seller can't be paid (`CustodyNotMoved`), and the buyer can get a refund while the conditions aren't met.
- **Can the buyer take the money back after receiving the crate?** No, `ReleaseConditionsMet()`. Otherwise they'd keep both the goods and the money.
- **Why not one contract?** Different data, different admins (regulator/inspectors vs market authority), different reasons to change. The registry has no money logic, and the escrow has no custody logic.
- **Is anything stored off-chain?** Yes: metadata (only the URI) and checkpoint records (only their hash). That's cheaper, and the hash still proves the record wasn't changed.
- **Security?** Access control on every write, checks → effects → interactions, `nonReentrant` on payouts, SafeERC20, custom errors, zero-address checks, one open sale per batch.
- **Who did what?** Person A: `BatchRegistry`, its migration, the batches UI and the tests. Person B: `FarmCoin`, `PriceCapEscrow`, the mock registry and the tests. The shared interface was agreed first. The deploy script for B's contracts, the market UI and the integration tests were finished by Person A's AI agent for the demo and logged in `roadmap-B.md`.

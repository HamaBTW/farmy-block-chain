# Farmy v2 — Teacher Demo (≈ 7 min)

A click-by-click script to show everything we built: a piece of **land** produces a **lot of olives**, the
lot is checked and validated, split into smaller lots, and one part is sold without the price being allowed
to explode. The money is **FarmCoin**, bought with test ETH.

This is v2, made after the teacher's review: assets are land, machines and lots; lots can be split;
FarmCoin has a maximum supply and is backed by ETH ([spec](docs/superpowers/specs/2026-11-08-farmy-v2-assets-lots-ethcoin-design.md)).

---

## Part 1 — Explained simply (read this first)

Imagine **an olive grove** 🌍 that gives **1000 kg of olives** 🫒 at harvest.

| Real world | In our project | Simple picture |
|------------|----------------|----------------|
| A land parcel | a **Land NFT** (`BatchRegistry`) | The **property deed**. Only one exists, and everybody can read it |
| A big machine | a **Machine NFT** | The machine's **registration card** |
| A harvest | a **Lot NFT**, linked to its land | A **crate label** that says which field it came from |
| Cutting the harvest into smaller parts | **Splitting**: child lots, the big lot is closed | Cutting one big label into smaller ones that still name the same field |
| Who is holding it | the NFT owner (**custodian**) | Whoever has the label in their pocket is holding the goods |
| The inspector | `checkAndValidate` | A **doctor's stamp**: "checked, then validated", in one go ✅ |
| Money | **FarmCoin (FRM)**, an ERC-20 token | **Play money** you buy with test ETH at a fixed rate (1 ETH = 1000 FRM), and can always sell back |
| Paying safely | **PriceCapEscrow** | A **robot piggy bank**: the buyer puts the money in, and the robot only gives it to the seller when the goods are validated ✅ **and** in the buyer's hands |
| No price gouging | the **price cap** (+20% max) | A rule: "you can resell for at most 20% more than the last price". Last price 600? Max 720. 800 is refused |

**The tools**

| Tool | Simple picture |
|------|----------------|
| **Ganache** | A pretend blockchain running on our laptop. Free test ETH (about 10,000 per account), instant blocks |
| **Truffle** | The toolbox: it compiles our Solidity code, sends it to Ganache (`migrate`) and runs the tests |
| **Demo mode** (MetaMask optional) | The site signs for the named people (Regulator, Farmer, Buyer…) so we can switch person with one click. MetaMask still works if you prefer it |
| **Next.js website** | The screens. It **reads** the blockchain directly, and every **write** is a real transaction |

**Why two contracts, not one?**
The **registry** knows the *physical world*: who holds the land, machine or lot, was it checked, what was
its last price, is it still active. The **escrow** knows *money and rules*: balances, deposits, the 20%
cap. They talk through one small "plug", the interface `IBatchRegistry`. The registry never calls the
escrow; the escrow only reads it, plus **one** write, `recordSalePrice`, which only the escrow is
allowed to call. v2 added one function to the plug, `isActive`: it is false for a lot that was split, so
the escrow refuses to sell a closed lot.

**The golden rule we demo:** the website can *warn* you, but the **smart contract decides**. Every
"no" you'll see comes from the blockchain, not from the website.

---

## Part 2 — Prepare before the teacher arrives (not timed)

1. **Ganache GUI** is running: RPC `127.0.0.1:7545`, network ID `5777`.
2. Fresh deploy and start the site:
   ```bash
   cd farmy_blockchain && npm run migrate
   ```
   ```bash
   cd ../farmy_web && npm run dev
   ```
   Open http://localhost:3000. **Demo mode** starts as **🚜 Farmer**: no wallet to import.
3. **Setup clicks, as 🏛️ Regulator** (switch with the "Acting as" menu, top right):
   - **Farm → Regulator tools → Make inspector** on 🔍 Inspector → "Inspector is now an inspector".
   - **Register land or machine** → Land, `Olive grove`, Sfax, `4` ha, `5000` FRM, holder 🚜 Farmer → **Register land**. You land on land #1's page.
4. **Setup click, as 🛒 Buyer:** **Market → Wallet** → `1` ETH → **Buy FRM** → "You have 1000 FRM".
5. Run the tests once and keep the terminal open for the last scene:
   ```bash
   cd farmy_blockchain && npx truffle test --network development
   ```
   → **124 passing**. This doesn't touch your demo deployment: the tests deploy their own throwaway copies. (The web app has 34 more tests: `cd farmy_web && npm test`.)

> Rejected actions show their error **instantly**: the contract refuses during the gas estimate (dry
> run), so nothing is sent and no gas is spent.

---

## Part 3 — The live script (≈ 7 min)

Say the **💬 lines** out loud; do the **🖱️ lines**. Use the "Acting as" menu (top right) to change person.

### Scene 1 — The land makes a lot (0:00 → 1:00)
🖱️ Act as **🚜 Farmer**, open land #1 (Farm → Land).
💬 "Land #1 is an NFT, the deed of an olive grove in Sfax, registered by the regulator. The farmer holds it."
🖱️ In **Next step**, expand **🌾 Harvest a lot** → Olives, `1000` kg, `1000` FRM → **Harvest lot** → you land on lot #2.
💬 "Harvest is traceability: the lot is linked to its land forever. Look at the family tree: 🌍 From land #1."

### Scene 2 — Hand over and inspection (1:00 → 2:15)
🖱️ Expand **🤝 Hand over to someone** → 🚚 Transporter → **Hand over** → "Handed to 🚚 Transporter".
💬 "Handing over the lot means moving the NFT. The journey shows every step."
🖱️ Act as **🔍 Inspector** → **✅ Check and validate** → weight `998`, temperature `4`, place Sfax → **Check and validate**.
💬 "Checked, then validated, in one transaction." Point at the journey: 📋 Checked (998 kg · 4 °C · Sfax), then ✅ Validated, same block.
💬 "Only a hash of the check is stored on-chain; the details stay off-chain."

### Scene 3 — To the warehouse (2:15 → 2:45)
🖱️ Act as **🚚 Transporter** → Hand over → 🏬 Warehouse.

### Scene 4 — Split the lot (2:45 → 3:45) ⭐
🖱️ Act as **🏬 Warehouse** → **✂️ Split into smaller lots** → `600` and `400` → **Split lot**.
💬 "One harvest goes to many places. Each part keeps its history and its share of the price." → lots **#3 (600 FRM)** and **#4 (400 FRM)**; lot #2 shows ✂️ Split and is closed.
🖱️ Open lot #3: it is already ✅ Validated, and the tree says "From land #1 · Split from lot #2".

### Scene 5 — The price cap (3:45 → 4:45) ⭐
🖱️ On lot #3: Sale price `800` → **List for sale** → "This price is above the cap of 720 FRM…".
💬 "The cap comes from this lot's own last price: 600 + 20% = 720. 800 is refused." (The escrow would refuse it too.)
🖱️ Price `700` → **List for sale** → "Listed for sale".

### Scene 6 — The buyer pays into the robot piggy bank (4:45 → 5:30)
🖱️ Act as **🛒 Buyer** → lot #3 → **Buy for 700 FRM** → "🔒 Paid into escrow".
💬 "The money is locked in the escrow, not with the seller."

### Scene 7 — Delivery and payment (5:30 → 6:30)
🖱️ Act as **🏬 Warehouse** → **Hand goods to 🛒 Buyer**. Then, as anyone → **Release payment**.
💬 "Both conditions are true (validated and in the buyer's hands), so the escrow pays the warehouse and tells the registry the new last price." → 💸 Payment released, 📈 "New last price 700 FRM".
🖱️ Market → Wallet (as Warehouse): **700 FRM**.
💬 "And the cap moved with it: the next seller can ask at most 840."

### Optional scene — Every FRM is backed by ETH (6:30 → 7:00)
🖱️ Act as **🛒 Buyer** → Market → Wallet → **Sell FRM**: `100` → "You get 0.1 ETH" → **Sell FRM**.
💬 "The reserve drops by 0.1 ETH. Every FRM is backed by ETH, so you can always sell it back." Point at "ETH held to back it".

### Last scene — Quality
🖱️ Show the terminal: **124 passing**.
💬 "Every function has tests for the happy path, every revert, every access rule and every event, and the integration tests replay the whole story with both real contracts. Payments use OpenZeppelin's SafeERC20 and ReentrancyGuard; FarmCoin keeps the invariant reserve = supply / 1000."

---

## If you're running late
- Skip **Scene 3**: in Scene 2 the Farmer hands over straight to the **🏬 Warehouse** (the Inspector still checks and validates there).
- Skip the optional scene.

## If something goes wrong
| Symptom | Fix |
|---------|-----|
| A red or orange message under a button | It's the contract refusing; explain the rule in words |
| A page didn't update | It refreshes on every new block (~4 s); otherwise reload the page |
| "not deployed" on the home page | Ganache was restarted: `npm run migrate`, then redo Part 2 steps 3 and 4 |
| Wallet shows 0 ETH | The Ganache account was emptied; restart Ganache and `npm run migrate` |

---

## Likely teacher questions (short answers)

- **Why an NFT for land, machines and lots?** Each one is unique, so it's non-fungible. Owning the NFT = holding the asset, so custody can't be faked or duplicated.
- **Why an ERC-20 for money?** FRM coins are interchangeable (fungible), like real money.
- **Why not one NFT for the whole harvest?** Because one harvest goes to many places. Splitting gives each part its own NFT, history and share of the price, all still linked to the same land.
- **Why not ERC-1155?** Custody and validation need one holder per part, with its own history; ERC-1155 balances are anonymous units.
- **What gives FRM value?** The reserve of ETH in the FarmCoin contract. The invariant is reserve = supply / 1000, and you can always sell back at the same rate.
- **What is the max supply?** 1,000,000 FRM, set when the contract is deployed. Buying beyond it is refused.
- **Can someone split a lot that is for sale?** Yes, but then the lot is closed: the sale can't complete and the buyer gets a refund.
- **What stops someone from calling `recordSalePrice` and faking a price?** Only the escrow address set by the regulator may call it (`NotEscrow()` for everyone else, including the regulator).
- **What if the buyer never receives the goods?** The seller can't be paid (`CustodyNotMoved`), and the buyer can get a refund while the conditions aren't met.
- **Can the buyer take the money back after receiving the goods?** No, `ReleaseConditionsMet()`. Otherwise they'd keep both the goods and the money.
- **Why not one contract?** Different data, different admins (regulator/inspectors vs market authority), different reasons to change. The registry has no money logic, and the escrow has no custody logic.
- **Is anything stored off-chain?** Yes: metadata (only a link or hash) and checkpoint records (only their hash). That's cheaper, and the hash still proves the record wasn't changed.
- **Security?** Access control on every write, checks → effects → interactions, `nonReentrant` on payouts and on selling FRM, SafeERC20, custom errors, zero-address checks, one open sale per asset.
- **Who did what?** Person A: `BatchRegistry`, its migration, the Farm screens and the tests. Person B: `FarmCoin`, `PriceCapEscrow`, the mock registry and the tests. The shared interface was agreed first; v2 was built after the teacher review (see the roadmaps).

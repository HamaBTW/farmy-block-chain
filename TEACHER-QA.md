# Farmy: NFT, FT, Smart Contracts and Who Did What

## NFT and FT in Farmy

| | **NFT** | **FT** |
|---|---|---|
| **In our project** | A farm **asset**: a piece of **land**, a **machine**, or a **lot** (a crate of tomatoes harvested from land) | **FarmCoin (FRM)**, our play money |
| **Contract** | `BatchRegistry` (ERC-721) | `FarmCoin` (ERC-20) |
| **Why this type** | Every asset is unique: land #1 and lot #3 each have their own history, holder and price | All coins are identical: one FRM is worth the same as any other FRM |
| **Everyday comparison** | A numbered passport for one field, tractor or crate | Coins in your pocket |

**How the NFT is used:** whoever owns lot #3's NFT is the person holding the crate right now. When the farmer hands it to the transporter, the NFT moves too. A farmer harvests a lot from their land, and a validated lot can be split into smaller lots (child lots), each with its own NFT, that can go to different places.

**How the FT is used:** nobody mints FRM for free. Anyone buys FRM with ETH at 1 ETH = 1000 FRM, and can sell it back for ETH at the same rate. The maximum supply is 1,000,000 FRM, and the ETH held in the FarmCoin contract (the reserve) backs every FRM. Buyers pay for assets with FRM.

## Where the smart contracts are

They're all in [farmy_blockchain/contracts/](farmy_blockchain/contracts/):

| File | What it does |
|---|---|
| [BatchRegistry.sol](farmy_blockchain/contracts/registry/BatchRegistry.sol) | **The NFT:** registers land and machines, harvests lots from land, splits lots into child lots, tracks who holds each asset, and records checkpoints, validation and the last price (the app calls it the Farm) |
| [FarmCoin.sol](farmy_blockchain/contracts/payment/FarmCoin.sol) | **The FT:** the FRM coin, bought with ETH and sold back for ETH |
| [PriceCapEscrow.sol](farmy_blockchain/contracts/payment/PriceCapEscrow.sol) | **The safe (neither NFT nor FT):** holds the buyer's money until the sale is complete, and blocks prices above the cap |
| [IBatchRegistry.sol](farmy_blockchain/contracts/interfaces/IBatchRegistry.sol) | **The agreement:** the list of functions that lets the escrow talk to the registry |

These files are the source code. The running copies live on our local Ganache blockchain, and `npm run migrate` deploys them there. [migrations/](farmy_blockchain/migrations/) holds the deployment scripts, and the website only talks to the deployed copies.

## If the teacher asks who did what

**Person A built the passport for the food:**

> "I made the system that gives every piece of land, machine and lot of food a digital passport, which is an NFT. Lots are harvested from land and can be split into smaller lots. The passport shows who holds it now, who checked it (an inspector does a 'Check and validate'), and whether it was approved. Nobody can secretly change that history."

**Person B built the money and the fair price:**

> "I made our play money, FarmCoin, which you buy with ETH (1 ETH = 1000 FRM) and can sell back, and a safe called the escrow. The buyer's money waits in the safe until the asset is approved and delivered, then the seller gets paid. The safe also refuses any price above the limit, so nobody can overcharge."

**How the two parts connect:**

> "A's part knows the food and its last price. B's part handles the money. Before a sale, the safe asks the passport what the last price was, then works out the highest price allowed. After a sale, it writes the new price back into the passport."

**One-sentence version:**

> "Person A tracks the food, Person B handles the money, and together they stop anyone from cheating on the price."

## Check this before you answer

That split is how the project was divided in [rules.md](rules.md), but the real history is messier:

- Person A asked for Person B's missing tasks to be finished, so some of that work came through Person A's side.
- Person B's account made the UI redesign commits.
- A lot of the code was written with Claude.

The teacher can see the commits, so if they ask who wrote what, describe it the way it actually happened. Also make sure each of you can explain your own contract without notes, because that's the most likely follow-up.

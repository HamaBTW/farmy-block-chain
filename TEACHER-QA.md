# Farmy: NFT, FT, Smart Contracts and Who Did What

## NFT and FT in Farmy

| | **NFT** | **FT** |
|---|---|---|
| **In our project** | A **farm batch**, like a crate of tomatoes | **FarmCoin (FRM)**, our play money |
| **Contract** | `BatchRegistry` (ERC-721) | `FarmCoin` (ERC-20) |
| **Why this type** | Every batch is unique: batch #1 has its own history, holder and price | All coins are identical: one FRM is worth the same as any other FRM |
| **Everyday comparison** | A numbered passport for one crate | Coins in your pocket |

**How the NFT is used:** whoever owns batch #1's NFT is the person holding the crate right now. When the farmer hands it to the transporter, the NFT moves too.

**How the FT is used:** the Regulator mints FRM, and buyers pay with it.

## Where the smart contracts are

They're all in [farmy_blockchain/contracts/](farmy_blockchain/contracts/):

| File | What it does |
|---|---|
| [BatchRegistry.sol](farmy_blockchain/contracts/registry/BatchRegistry.sol) | **The NFT:** creates batches, tracks who holds them, and records checkpoints, validation and the last price |
| [FarmCoin.sol](farmy_blockchain/contracts/payment/FarmCoin.sol) | **The FT:** the FRM coin |
| [PriceCapEscrow.sol](farmy_blockchain/contracts/payment/PriceCapEscrow.sol) | **The safe (neither NFT nor FT):** holds the buyer's money until the sale is complete, and blocks prices above the cap |
| [IBatchRegistry.sol](farmy_blockchain/contracts/interfaces/IBatchRegistry.sol) | **The agreement:** the list of functions that lets the escrow talk to the registry |

These files are the source code. The running copies live on our local Ganache blockchain, and `npm run migrate` deploys them there. [migrations/](farmy_blockchain/migrations/) holds the deployment scripts, and the website only talks to the deployed copies.

## If the teacher asks who did what

**Person A built the passport for the food:**

> "I made the system that gives every batch of food a digital passport, which is an NFT. It shows who made the batch, who holds it now, who checked it, and whether it was approved. Nobody can secretly change that history."

**Person B built the money and the fair price:**

> "I made our play money, FarmCoin, and a safe called the escrow. The buyer's money waits in the safe until the batch is approved and delivered, then the seller gets paid. The safe also refuses any price above the limit, so nobody can overcharge."

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

"use client";

import { getDeployment } from "@/lib/contracts";

/** Person B: FarmCoin + PriceCapEscrow screens (balances, sales, deposit, release, refund) live in this folder. */
export function MarketHome() {
  const coin = getDeployment("FarmCoin");
  const escrow = getDeployment("PriceCapEscrow");
  return (
    <div className="card">
      <h1 className="text-xl font-bold mb-2">Market</h1>
      <p className="text-sm opacity-70">
        {coin && escrow
          ? `FarmCoin at ${coin.address}, PriceCapEscrow at ${escrow.address}`
          : "FarmCoin / PriceCapEscrow are not deployed yet. Run `npm run migrate` in farmy_blockchain."}
      </p>
    </div>
  );
}

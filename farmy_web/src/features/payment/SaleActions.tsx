"use client";

import { mined, useContractTx } from "@/lib/tx";
import type { Sale } from "./sales";
import { formatFrm } from "./useMarket";

type Props = { sale: Sale; account: string; balance: bigint; onDone: () => void };

/** Buttons for one sale, depending on its state and who is looking. The escrow enforces every rule. */
export function SaleActions({ sale, account, balance, onDone }: Props) {
  const me = account.toLowerCase();
  const isSeller = sale.seller.toLowerCase() === me;
  if (sale.state === "Created" && !isSeller) return <BuyButton sale={sale} account={account} balance={balance} onDone={onDone} />;
  return null;
}

function BuyButton({ sale, account, balance, onDone }: Props) {
  const { run, pending, error } = useContractTx();
  const short = balance < sale.price;
  return (
    <div className="pt-2 space-y-1">
      {short && <p className="text-xs text-amber-600">Your balance ({formatFrm(balance)}) is below the price: the deposit will fail.</p>}
      <button
        className="btn"
        disabled={pending}
        onClick={() =>
          run(async (signed) => {
            const escrow = signed("PriceCapEscrow");
            const coin = signed("FarmCoin");
            // Step 1: let the escrow pull the FRM (skipped if already approved)
            const allowance: bigint = await coin.allowance(account, await escrow.getAddress());
            if (allowance < sale.price) await mined(coin.approve(await escrow.getAddress(), sale.price));
            // Step 2: lock the FRM in escrow; the caller becomes the buyer
            await mined(escrow.deposit(sale.id));
            onDone();
          })
        }
      >
        {pending ? "Confirm in MetaMask…" : `Buy: approve + deposit ${formatFrm(sale.price)}`}
      </button>
      {error && <p className="text-sm text-red-500 break-all">{error}</p>}
    </div>
  );
}

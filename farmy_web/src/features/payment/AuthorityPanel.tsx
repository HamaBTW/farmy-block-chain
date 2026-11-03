"use client";

import { useState } from "react";
import { parseUnits } from "ethers";
import { mined, useContractTx } from "@/lib/tx";

type Props = { account: string; isAuthority: boolean; markup: number; onDone: () => void };

/** Market authority tools: mint demo FRM and set the max markup. The contracts enforce the role. */
export function AuthorityPanel({ account, isAuthority, markup, onDone }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="font-semibold">🏦 Market authority</h2>
      {!isAuthority && <p className="text-xs text-amber-600">You are not the market authority: the contracts will reject these actions.</p>}
      <MintForm account={account} onDone={onDone} />
      <MarkupForm markup={markup} onDone={onDone} />
    </div>
  );
}

function MintForm({ account, onDone }: { account: string; onDone: () => void }) {
  const [to, setTo] = useState(account);
  const [amount, setAmount] = useState("1000");
  const { run, pending, error } = useContractTx();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async (signed) => {
          await mined(signed("FarmCoin").mint(to, parseUnits(amount, 18)));
          onDone();
        });
      }}
    >
      <label className="block text-sm">
        <span className="block mb-1 opacity-70">Mint FRM to (simulated money)</span>
        <input className="input font-mono" value={to} onChange={(e) => setTo(e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="block mb-1 opacity-70">Amount (FRM)</span>
        <input className="input font-mono" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required />
      </label>
      <button className="btn" disabled={pending}>{pending ? "Confirm in MetaMask…" : "Mint FRM"}</button>
      {error && <p className="text-sm text-red-500 break-all">{error}</p>}
    </form>
  );
}

function MarkupForm({ markup, onDone }: { markup: number; onDone: () => void }) {
  const [percent, setPercent] = useState(String(markup));
  const { run, pending, error } = useContractTx();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async (signed) => {
          await mined(signed("PriceCapEscrow").setMaxMarkup(Number(percent)));
          onDone();
        });
      }}
    >
      <label className="block text-sm">
        <span className="block mb-1 opacity-70">Max markup (%), currently {markup}%</span>
        <input className="input font-mono" value={percent} onChange={(e) => setPercent(e.target.value)} inputMode="numeric" required />
      </label>
      <button className="btn" disabled={pending}>{pending ? "Confirm in MetaMask…" : "Set max markup"}</button>
      {error && <p className="text-sm text-red-500 break-all">{error}</p>}
    </form>
  );
}

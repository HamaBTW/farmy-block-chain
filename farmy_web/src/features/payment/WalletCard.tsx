"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "ethers";
import { AmountInput, parseFrm } from "@/components/ui/AmountInput";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { TxButton } from "@/components/ui/TxButton";
import { getContract, getReadProvider } from "@/lib/contracts";
import { formatFrm } from "@/lib/format";
import { mined } from "@/lib/tx";

const RATE = BigInt(1000); // FarmCoin.RATE: 1 ETH = 1000 FRM

type Wallet = { eth: bigint; frm: bigint; supply: bigint; cap: bigint; reserve: bigint };

/** Person B: the acting person's ETH and FRM, buying FRM with ETH and selling it back, and how much of the max supply is used. */
export function WalletCard({ account, version, onDone }: { account: string; version: number; onDone: () => void }) {
  const [w, setW] = useState<Wallet | null>(null);
  const [ethIn, setEthIn] = useState("1");
  const [frmIn, setFrmIn] = useState("");

  useEffect(() => {
    const coin = getContract("FarmCoin");
    if (!coin) return;
    let live = true;
    Promise.all([getReadProvider().getBalance(account), coin.balanceOf(account), coin.totalSupply(), coin.cap(), coin.reserve()])
      .then(([eth, frm, supply, cap, reserve]: bigint[]) => live && setW({ eth, frm, supply, cap, reserve }))
      .catch(() => live && setW(null));
    return () => {
      live = false;
    };
  }, [account, version]);

  let ethWei: bigint | null = null;
  try {
    const v = parseEther(ethIn.trim() || "0");
    ethWei = v > BigInt(0) ? v : null;
  } catch {
    ethWei = null;
  }
  const frmWei = parseFrm(frmIn);
  const used = w && w.cap > BigInt(0) ? Number((w.supply * BigInt(10000)) / w.cap) / 100 : 0;

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold">Wallet</h2>
        <p className="text-sm text-ink-soft">1 ETH = 1000 FRM, both ways</p>
      </div>
      {w && (
        <p className="text-sm">
          You have <b className="tabular">{formatFrm(w.frm)}</b> and <b className="tabular">{formatEther(w.eth)} ETH</b>
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <section className="space-y-2">
          <Field label="Buy FRM with ETH">
            <input className="input tabular" inputMode="decimal" value={ethIn} onChange={(e) => setEthIn(e.target.value)} />
          </Field>
          <p className="text-xs text-ink-soft">You get {ethWei ? formatFrm(ethWei * RATE) : "…"}</p>
          <TxButton label="Buy FRM" done="FRM bought" variant="primary" disabled={!ethWei} send={(signed) => mined(signed("FarmCoin").buy({ value: ethWei! }))} onDone={onDone} />
        </section>
        <section className="space-y-2">
          <AmountInput label="Sell FRM for ETH" value={frmIn} onChange={setFrmIn} />
          <p className="text-xs text-ink-soft">You get {frmWei ? `${formatEther(frmWei / RATE)} ETH` : "…"}</p>
          <TxButton
            label="Sell FRM"
            done="FRM sold"
            disabled={!frmWei}
            send={(signed) => mined(signed("FarmCoin").sell(frmWei!))}
            onDone={() => {
              setFrmIn("");
              onDone();
            }}
          />
        </section>
      </div>
      {w && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full bg-field" style={{ width: `${used}%` }} />
          </div>
          <p className="text-xs text-ink-soft">
            {formatFrm(w.supply)} of {formatFrm(w.cap)} max supply in use · {formatEther(w.reserve)} ETH held to back it
          </p>
        </div>
      )}
    </Card>
  );
}

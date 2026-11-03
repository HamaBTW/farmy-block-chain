"use client";

import { useState } from "react";
import { parseUnits } from "ethers";
import { AmountInput, parseFrm } from "@/components/ui/AmountInput";
import { Choices, Field } from "@/components/ui/Field";
import { PersonPicker } from "@/components/ui/PersonPicker";
import { TxButton } from "@/components/ui/TxButton";
import { formatFrm } from "@/lib/format";
import { personLabel } from "@/lib/people";
import { usePeople } from "@/lib/people/PeopleProvider";
import { mined } from "@/lib/tx";
import { useBalance } from "./useMarket";

const AMOUNTS = ["100", "500", "1000"].map((v) => ({ label: v, value: parseUnits(v, 18) }));
const MARKUPS = ["10", "20", "30"];

/** Market authority tools: mint demo FRM and set the max markup. The contracts enforce the role. */
export function AuthorityPanel({ markup, version, onDone }: { markup: number; version: number; onDone: () => void }) {
  return (
    <div className="space-y-8">
      <MintForm version={version} onDone={onDone} />
      <MarkupForm markup={markup} onDone={onDone} />
    </div>
  );
}

function MintForm({ version, onDone }: { version: number; onDone: () => void }) {
  const { people } = usePeople();
  const [to, setTo] = useState(() => people.find((p) => p.role === "buyer")?.address ?? "");
  const [amount, setAmount] = useState("500");
  const wei = parseFrm(amount);
  const balance = useBalance(to, version);
  return (
    <section className="space-y-3">
      <h3 className="font-display text-lg font-bold">🪙 Mint FRM</h3>
      <p className="text-sm text-ink-soft">Simulated money for the demo. Buyers need FRM before they can pay into escrow.</p>
      <PersonPicker label="Give FRM to" value={to} onChange={setTo} />
      {balance !== null && (
        <p className="text-sm">
          <span className="text-ink-soft">{personLabel(people, to)} has</span> <b className="tabular">{formatFrm(balance)}</b>
        </p>
      )}
      <AmountInput label="Amount" value={amount} onChange={setAmount} quick={AMOUNTS} />
      <TxButton
        label="Mint FRM"
        done={`FRM minted for ${to ? personLabel(people, to) : "them"}`}
        variant="primary"
        disabled={!to || !wei}
        send={(signed) => mined(signed("FarmCoin").mint(to, wei!))}
        onDone={onDone}
      />
    </section>
  );
}

function MarkupForm({ markup, onDone }: { markup: number; onDone: () => void }) {
  const [percent, setPercent] = useState(String(markup));
  const valid = /^\d{1,5}$/.test(percent) && Number(percent) <= 65535;
  return (
    <section className="space-y-3">
      <h3 className="font-display text-lg font-bold">📏 Max markup</h3>
      <p className="text-sm text-ink-soft">A sale may cost at most the last price plus this percent. It is {markup}% now.</p>
      <Choices options={MARKUPS} value={percent} onChange={setPercent} render={(v) => `${v}%`} />
      <Field label="Or another percent">
        <input className="input tabular" inputMode="numeric" value={percent} onChange={(e) => setPercent(e.target.value)} />
      </Field>
      <TxButton
        label="Set max markup"
        done="Max markup updated"
        variant="primary"
        disabled={!valid || Number(percent) === markup}
        send={(signed) => mined(signed("PriceCapEscrow").setMaxMarkup(Number(percent)))}
        onDone={onDone}
      />
    </section>
  );
}

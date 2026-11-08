"use client";

import { useState } from "react";
import { Choices, Field } from "@/components/ui/Field";
import { TxButton } from "@/components/ui/TxButton";
import { mined } from "@/lib/tx";

const MARKUPS = ["10", "20", "30"];

/** Market authority tools: set the max markup. FRM can't be minted for free; people buy it with ETH. */
export function AuthorityPanel({ markup, onDone }: { markup: number; onDone: () => void }) {
  return <MarkupForm markup={markup} onDone={onDone} />;
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

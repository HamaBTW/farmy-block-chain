"use client";

import { useEffect, useState } from "react";
import { AmountInput, parseFrm } from "@/components/ui/AmountInput";
import { TxButton } from "@/components/ui/TxButton";
import { getContract } from "@/lib/contracts";
import { formatFrm } from "@/lib/format";
import type { Step } from "@/lib/journey";
import type { SaleContext } from "@/lib/journeyData";
import { personLabel } from "@/lib/people";
import { usePeople } from "@/lib/people/PeopleProvider";
import { mined } from "@/lib/tx";
import { useChainVersion } from "@/lib/useChainVersion";
import { priceCap } from "./sales";
import { useBalance } from "./useMarket";

/** Person B: the market steps of one batch that the acting person can do. The escrow enforces every rule. */
export function SalePanel({ batch, steps, me, onDone }: SaleContext) {
  return (
    <>
      {steps.map((s) => (
        <SaleStep key={s.action} step={s} ctx={{ batch, steps, me, onDone }} />
      ))}
    </>
  );
}

function SaleStep({ step, ctx }: { step: Step; ctx: SaleContext }) {
  const { batch, me, onDone } = ctx;
  const { people } = usePeople();
  const sale = batch.sale;
  const variant = step.primary ? "primary" : "secondary";

  switch (step.action) {
    case "listForSale":
      return <ListForSale batchId={batch.batchId} lastPrice={batch.lastPrice} onDone={onDone} />;
    case "buy":
      return <BuyButton saleId={sale!.id} price={sale!.price} me={me} onDone={onDone} />;
    case "handToBuyer":
      return (
        <TxButton
          label={`Hand goods to ${personLabel(people, sale!.buyer)}`}
          done="Goods handed to the buyer"
          variant={variant}
          send={(signed) => mined(signed("BatchRegistry").transferCustody(batch.batchId, sale!.buyer))}
          onDone={onDone}
        />
      );
    case "release":
      return <TxButton label="Release payment" done="Payment released" variant={variant} send={(signed) => mined(signed("PriceCapEscrow").releasePayment(sale!.id))} onDone={onDone} />;
    default: {
      const labels: Record<string, [string, string]> = {
        cancelListing: ["Cancel listing", "Listing cancelled"],
        clearListing: ["Clear old listing", "Old listing cleared"],
        refundBuyer: ["Cancel and refund buyer", "Buyer refunded"],
        refundMe: ["Refund me", "Refunded"],
      };
      const [label, done] = labels[step.action];
      return (
        <TxButton
          label={label}
          done={done}
          variant={step.primary ? "primary" : "danger"}
          send={(signed) => mined(signed("PriceCapEscrow").refund(sale!.id))}
          onDone={onDone}
        />
      );
    }
  }
}

function ListForSale({ batchId, lastPrice, onDone }: { batchId: bigint; lastPrice: bigint; onDone: () => void }) {
  const markup = useMarkup();
  const cap = markup === null ? null : priceCap(lastPrice, markup);
  const [price, setPrice] = useState("");
  const priceWei = parseFrm(price);
  const tenPercent = (lastPrice * BigInt(110)) / BigInt(100);
  const quick = cap === null ? [] : [
    { label: "At cap", value: cap },
    { label: "Same price", value: lastPrice },
    { label: "+10%", value: tenPercent > cap ? cap : tenPercent },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-line p-3">
      <AmountInput
        label="🏷️ Sale price"
        value={price}
        onChange={setPrice}
        quick={quick}
        hint={cap !== null && `Cap: ${formatFrm(cap)} (last price ${formatFrm(lastPrice)} + ${markup}%).`}
      />
      {cap !== null && priceWei !== null && priceWei > cap && (
        <p className="text-sm text-harvest-ink">This is above the cap: the escrow will refuse it.</p>
      )}
      <TxButton
        label="List for sale"
        done="Listed for sale"
        variant="primary"
        disabled={!priceWei}
        send={(signed) => mined(signed("PriceCapEscrow").createSale(batchId, priceWei!))}
        onDone={() => {
          setPrice("");
          onDone();
        }}
      />
    </div>
  );
}

function BuyButton({ saleId, price, me, onDone }: { saleId: bigint; price: bigint; me: string; onDone: () => void }) {
  const { version } = useChainVersion();
  const balance = useBalance(me, version);
  const tooPoor = balance !== null && balance < price;
  return (
    <div className="space-y-1">
      {tooPoor && <p className="text-sm text-harvest-ink">You have {formatFrm(balance)}. Buy more FRM with ETH on the Market first.</p>}
      <TxButton
        label={`Buy for ${formatFrm(price)}`}
        done="Paid into escrow"
        variant="primary"
        disabled={tooPoor}
        send={async (signed) => {
          const escrow = signed("PriceCapEscrow");
          const coin = signed("FarmCoin");
          const spender = await escrow.getAddress();
          // Let the escrow pull the FRM first (skipped if already allowed), then lock it.
          if (((await coin.allowance(me, spender)) as bigint) < price) await mined(coin.approve(spender, price));
          await mined(escrow.deposit(saleId));
        }}
        onDone={onDone}
      />
    </div>
  );
}

function useMarkup(): number | null {
  const { version } = useChainVersion();
  const [markup, setMarkup] = useState<number | null>(null);
  useEffect(() => {
    const escrow = getContract("PriceCapEscrow");
    if (!escrow) return;
    let live = true;
    escrow.maxMarkupPercent().then((m: bigint) => live && setMarkup(Number(m))).catch(() => {});
    return () => {
      live = false;
    };
  }, [version]);
  return markup;
}

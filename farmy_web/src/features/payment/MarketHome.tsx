"use client";

import { useMemo, useState } from "react";
import { assetDocOf } from "@/components/ui/BatchChips";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { assetLabel } from "@/lib/assetLabel";
import { useBatchViews } from "@/lib/useBatchViews";
import { useChainVersion } from "@/lib/useChainVersion";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { AuthorityPanel } from "./AuthorityPanel";
import { SalesList } from "./SalesList";
import { useMarketContracts, useMarketInfo, useSales } from "./useMarket";
import { WalletCard } from "./WalletCard";

/** Person B: every sale, the acting person's FRM, and the market authority's tools. */
export function MarketHome() {
  const market = useMarketContracts();
  const { account, isOnGanache } = useWallet();
  const { version, reload } = useChainVersion();
  const { info, isAuthority } = useMarketInfo(market, account, version);
  const { sales, error, loaded } = useSales(market, version);
  const { batches } = useBatchViews(version);
  const [tools, setTools] = useState(false);

  const labels = useMemo(() => new Map(batches.map((b) => [b.batchId.toString(), assetLabel(b.kind, assetDocOf(b.uri), b.quantity)])), [batches]);
  const open = sales.filter((s) => s.state === "Created" || s.state === "Deposited");
  const finished = sales.filter((s) => s.state === "Released" || s.state === "Refunded");

  if (!market) {
    return (
      <Card>
        <h1 className="font-display text-3xl font-bold">Market</h1>
        <p className="mt-2 text-ink-soft">FarmCoin and the escrow aren&apos;t deployed yet. Run `npm run migrate` in farmy_blockchain, then reload.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-prose">
          <h1 className="font-display text-3xl font-bold">Market</h1>
          <p className="mt-1 text-ink-soft">
            Land, machines and lots for sale. The buyer&apos;s FRM waits in escrow until the asset is validated and handed over. No sale can go above the last price
            plus {info ? `${info.markup}%` : "the max markup"}.
          </p>
        </div>
        {isAuthority && <Button onClick={() => setTools(true)}>Market authority tools</Button>}
      </div>

      {account && isOnGanache && <WalletCard account={account} version={version} onDone={reload} />}

      <Card>
        <h2 className="mb-2 font-display text-xl font-bold">Open sales</h2>
        {loaded ? <SalesList sales={open} labels={labels} empty="Nothing is for sale right now. A holder lists a validated asset from its page." /> : <p className="text-sm text-ink-soft">Loading…</p>}
        {error && <p className="text-sm text-beet">{error}</p>}
      </Card>
      <Card>
        <h2 className="mb-2 font-display text-xl font-bold">Finished</h2>
        <SalesList sales={finished} labels={labels} empty="No finished sales yet." />
      </Card>

      <Drawer open={tools} title="Market authority tools" onClose={() => setTools(false)}>
        {tools && info && <AuthorityPanel markup={info.markup} onDone={reload} />}
      </Drawer>
    </div>
  );
}

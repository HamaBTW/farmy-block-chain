"use client";

import { useChainVersion } from "@/lib/useChainVersion";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { AuthorityPanel } from "./AuthorityPanel";
import { CreateSaleForm } from "./CreateSaleForm";
import { SaleActions } from "./SaleActions";
import { SalesList } from "./SalesList";
import { formatFrm, useMarketContracts, useMarketInfo, useSales } from "./useMarket";

/** Person B: FarmCoin + PriceCapEscrow screens (balances, sales, deposit, release, refund). */
export function MarketHome() {
  const market = useMarketContracts();
  const { account, isOnGanache } = useWallet();
  const { version, reload } = useChainVersion();
  const { info, isAuthority } = useMarketInfo(market, account, version);
  const { sales, error, loaded } = useSales(market, version);

  if (!market) {
    return (
      <div className="card">
        <h1 className="text-xl font-bold mb-2">Market</h1>
        <p className="text-sm opacity-70">FarmCoin / PriceCapEscrow are not deployed yet. Run `npm run migrate` in farmy_blockchain.</p>
      </div>
    );
  }

  const canWrite = !!account && isOnGanache;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold mr-2">Market</h1>
        {isAuthority && <span className="pill">market authority</span>}
      </div>
      <section className="card flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <span className="opacity-60">Your balance </span>
          <span className="font-mono font-semibold" data-testid="frm-balance">{info && account ? formatFrm(info.balance) : "—"}</span>
        </div>
        <div>
          <span className="opacity-60">Max markup </span>
          <span className="font-mono font-semibold">{info ? `${info.markup}%` : "…"}</span>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <section className="card space-y-3">
            <h2 className="font-semibold">Sales</h2>
            {!loaded ? (
              <p className="text-sm opacity-60">Loading…</p>
            ) : (
              <SalesList
                sales={sales}
                renderActions={
                  canWrite && info
                    ? (sale) => <SaleActions key={`${sale.id}-${account}`} sale={sale} account={account} balance={info.balance} onDone={reload} />
                    : undefined
                }
              />
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </section>
          {!canWrite && (
            <section className="card">
              <p className="text-sm opacity-60">Connect MetaMask on the Farmy network to trade.</p>
            </section>
          )}
        </div>
        {canWrite && info && (
          <div className="space-y-4">
            <section className="card">
              <CreateSaleForm market={market} account={account} markup={info.markup} version={version} onDone={reload} />
            </section>
            <section className="card">
              <AuthorityPanel key={account} account={account} isAuthority={isAuthority} markup={info.markup} onDone={reload} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

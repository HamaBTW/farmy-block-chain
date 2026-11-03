"use client";

import { useEffect, useState } from "react";
import { formatUnits, type Contract } from "ethers";
import { getContract } from "@/lib/contracts";

export type MarketContracts = { coin: Contract; escrow: Contract; registry: Contract };

/** Read-only FarmCoin, PriceCapEscrow and BatchRegistry, or null until all three are deployed. */
export function useMarketContracts(): MarketContracts | null {
  const [contracts] = useState(() => {
    const coin = getContract("FarmCoin");
    const escrow = getContract("PriceCapEscrow");
    const registry = getContract("BatchRegistry");
    return coin && escrow && registry ? { coin, escrow, registry } : null;
  });
  return contracts;
}

type MarketInfo = { balance: bigint; markup: number; authority: string };

/** Connected account's FRM balance, the max markup and the market authority address. */
export function useMarketInfo(market: MarketContracts | null, account: string | null, version: number) {
  const [info, setInfo] = useState<MarketInfo | null>(null);

  useEffect(() => {
    if (!market) return;
    let live = true;
    Promise.all([account ? market.coin.balanceOf(account) : BigInt(0), market.escrow.maxMarkupPercent(), market.escrow.owner()])
      .then(([balance, markup, authority]: [bigint, bigint, string]) =>
        live && setInfo({ balance, markup: Number(markup), authority }),
      )
      .catch(() => live && setInfo(null));
    return () => {
      live = false;
    };
  }, [market, account, version]);

  const isAuthority = !!info && !!account && info.authority.toLowerCase() === account.toLowerCase();
  return { info, isAuthority };
}

export function formatFrm(value: bigint): string {
  return `${formatUnits(value, 18)} FRM`;
}

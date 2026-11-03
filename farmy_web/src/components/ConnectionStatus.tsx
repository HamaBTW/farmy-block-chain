"use client";

import { useEffect, useState } from "react";
import { GANACHE } from "@/lib/chain";
import { getDeployment, getReadProvider, type ContractName } from "@/lib/contracts";
import { useWallet } from "@/lib/wallet/WalletProvider";

const CONTRACTS: ContractName[] = ["BatchRegistry", "FarmCoin", "PriceCapEscrow"];

/** Shows whether Ganache, MetaMask and the Truffle deployments are all wired up. */
export function ConnectionStatus() {
  const { hasMetaMask, account, chainId, isOnGanache, error } = useWallet();
  const [block, setBlock] = useState<number | null>(null);
  const [rpcError, setRpcError] = useState(false);

  useEffect(() => {
    getReadProvider()
      .getBlockNumber()
      .then(setBlock)
      .catch(() => setRpcError(true));
  }, []);

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-3">Connection status</h2>
      <ul className="space-y-2 text-sm">
        <Row ok={!rpcError && block !== null} label={`Ganache RPC ${GANACHE.rpcUrl}`}
          detail={rpcError ? "unreachable: is Ganache running?" : block === null ? "checking…" : `block #${block}`} />
        <Row ok={hasMetaMask} label="MetaMask installed" />
        <Row ok={!!account} label="Wallet connected" detail={account ?? "not connected"} />
        <Row ok={isOnGanache} label={`Network chain ID ${GANACHE.chainId}`} detail={chainId === null ? "unknown" : `wallet is on ${chainId}`} />
        {CONTRACTS.map((name) => {
          const d = getDeployment(name);
          return <Row key={name} ok={!!d} label={`${name} deployed`} detail={d?.address ?? "not migrated yet"} />;
        })}
      </ul>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </div>
  );
}

function Row({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="flex gap-2">
      <span>{ok ? "✅" : "⚪️"}</span>
      <span className="font-medium">{label}</span>
      {detail && <span className="opacity-60 font-mono break-all">{detail}</span>}
    </li>
  );
}

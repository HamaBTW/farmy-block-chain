"use client";

import { BrowserProvider, type JsonRpcSigner } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { GANACHE } from "../chain";

type WalletState = {
  hasMetaMask: boolean;
  account: string | null;
  chainId: number | null;
  isOnGanache: boolean;
  error: string | null;
  connect: () => Promise<void>;
  switchToGanache: () => Promise<void>;
  getSigner: () => Promise<JsonRpcSigner>;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // false on the server, real value after hydration.
  const hasMetaMask = useSyncExternalStore(noopSubscribe, () => !!window.ethereum, () => false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

    const onAccounts = (accounts: string[]) => setAccount(accounts[0] ?? null);
    const onChain = (hex: string) => setChainId(Number.parseInt(hex, 16));

    // Restore an existing connection without prompting.
    eth.request({ method: "eth_accounts" }).then(onAccounts).catch(() => {});
    eth.request({ method: "eth_chainId" }).then(onChain).catch(() => {});

    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener("accountsChanged", onAccounts);
      eth.removeListener("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return setError("MetaMask is not installed.");
    try {
      setError(null);
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accounts[0] ?? null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  const switchToGanache = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    try {
      setError(null);
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: GANACHE.chainIdHex }] });
    } catch (e) {
      // 4902: chain not added to MetaMask yet.
      if ((e as { code?: number }).code !== 4902) return setError(errorMessage(e));
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: GANACHE.chainIdHex,
            chainName: GANACHE.name,
            rpcUrls: [GANACHE.rpcUrl],
            nativeCurrency: GANACHE.currency,
          },
        ],
      });
    }
  }, []);

  const getSigner = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask is not installed.");
    // New provider each time: ethers v6 providers are bound to the network they started on.
    return new BrowserProvider(window.ethereum).getSigner();
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      hasMetaMask,
      account,
      chainId,
      isOnGanache: chainId === GANACHE.chainId,
      error,
      connect,
      switchToGanache,
      getSigner,
    }),
    [hasMetaMask, account, chainId, error, connect, switchToGanache, getSigner],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>.");
  return ctx;
}

const noopSubscribe = () => () => {};

function errorMessage(e: unknown): string {
  // -32002: MetaMask already has a request waiting for the user.
  if ((e as { code?: number }).code === -32002) return "MetaMask already has a request waiting. Open the MetaMask extension and answer it.";
  return (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? String(e);
}

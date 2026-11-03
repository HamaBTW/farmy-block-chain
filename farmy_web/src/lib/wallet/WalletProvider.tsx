"use client";

import { BrowserProvider, type JsonRpcSigner } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { GANACHE } from "../chain";
import { getReadProvider } from "../contracts";

export type WalletMode = "metamask" | "demo";

type WalletState = {
  hasMetaMask: boolean;
  /** Acting account: the Demo-mode person or the MetaMask account. */
  account: string | null;
  chainId: number | null;
  isOnGanache: boolean;
  error: string | null;
  mode: WalletMode;
  /** Demo mode works only when the read provider is the local Ganache chain (1337). */
  demoAvailable: boolean;
  setMode: (mode: WalletMode) => void;
  actAs: (address: string) => void;
  connect: () => Promise<void>;
  switchToGanache: () => Promise<void>;
  getSigner: () => Promise<JsonRpcSigner>;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // false on the server, real value after hydration.
  const hasMetaMask = useSyncExternalStore(noopSubscribe, () => !!window.ethereum, () => false);
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.get, prefsStore.getServer);
  const [metaMaskAccount, setMetaMaskAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [demoAvailable, setDemoAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode: WalletMode = prefs?.mode ?? (hasMetaMask ? "metamask" : "demo");

  useEffect(() => {
    getReadProvider()
      .getNetwork()
      .then((n) => setDemoAvailable(Number(n.chainId) === GANACHE.chainId))
      .catch(() => setDemoAvailable(false));
  }, []);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

    const onAccounts = (accounts: string[]) => setMetaMaskAccount(accounts[0] ?? null);
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

  const setMode = useCallback((next: WalletMode) => {
    setError(null);
    prefsStore.set({ mode: next, demoAccount: prefsStore.get()?.demoAccount ?? null });
  }, []);

  const actAs = useCallback((address: string) => {
    setError(null);
    prefsStore.set({ mode: "demo", demoAccount: address });
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return setError("MetaMask is not installed.");
    try {
      setError(null);
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setMetaMaskAccount(accounts[0] ?? null);
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

  const demoAccount = prefs?.demoAccount ?? null;

  const getSigner = useCallback(async () => {
    if (mode === "demo") {
      if (!demoAvailable) throw new Error("Demo mode only works on the local Ganache chain.");
      if (!demoAccount) throw new Error("Choose who you are first.");
      // Ganache's own accounts are unlocked, so the node signs for them. No private key reaches the browser.
      return getReadProvider().getSigner(demoAccount);
    }
    if (!window.ethereum) throw new Error("MetaMask is not installed.");
    // New provider each time: ethers v6 providers are bound to the network they started on.
    return new BrowserProvider(window.ethereum).getSigner();
  }, [mode, demoAvailable, demoAccount]);

  const value = useMemo<WalletState>(
    () => ({
      hasMetaMask,
      account: mode === "demo" ? demoAccount : metaMaskAccount,
      chainId,
      isOnGanache: mode === "demo" ? demoAvailable : chainId === GANACHE.chainId,
      error,
      mode,
      demoAvailable,
      setMode,
      actAs,
      connect,
      switchToGanache,
      getSigner,
    }),
    [hasMetaMask, mode, demoAccount, metaMaskAccount, chainId, demoAvailable, error, setMode, actAs, connect, switchToGanache, getSigner],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>.");
  return ctx;
}

const noopSubscribe = () => () => {};

type Prefs = { mode: WalletMode; demoAccount: string | null };

/** Wallet choice saved in this browser. A tiny external store so server and client renders agree. */
const prefsStore = (() => {
  const KEY = "farmy.wallet.v1";
  const listeners = new Set<() => void>();
  let cache: Prefs | null | undefined;
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get(): Prefs | null {
      if (cache === undefined) {
        try {
          cache = JSON.parse(localStorage.getItem(KEY) ?? "null") as Prefs | null;
        } catch {
          cache = null;
        }
      }
      return cache;
    },
    getServer: (): Prefs | null => null,
    set(next: Prefs) {
      cache = next;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage blocked: the choice lasts until reload.
      }
      listeners.forEach((l) => l());
    },
  };
})();

function errorMessage(e: unknown): string {
  // -32002: MetaMask already has a request waiting for the user.
  if ((e as { code?: number }).code === -32002) return "MetaMask already has a request waiting. Open the MetaMask extension and answer it.";
  return (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? String(e);
}

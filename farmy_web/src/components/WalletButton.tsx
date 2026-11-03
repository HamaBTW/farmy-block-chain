"use client";

import { shortAddress } from "@/lib/chain";
import { useWallet } from "@/lib/wallet/WalletProvider";

export function WalletButton() {
  const { hasMetaMask, account, isOnGanache, connect, switchToGanache } = useWallet();

  if (!hasMetaMask) {
    return (
      <a className="btn" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
        Install MetaMask
      </a>
    );
  }
  if (!account) return <button className="btn" onClick={connect}>Connect MetaMask</button>;
  if (!isOnGanache) return <button className="btn btn-warn" onClick={switchToGanache}>Switch to Farmy (Ganache)</button>;
  return <span className="pill font-mono">{shortAddress(account)}</span>;
}

import type { Eip1193Provider } from "ethers";

interface MetaMaskProvider extends Eip1193Provider {
  on(event: "accountsChanged", listener: (accounts: string[]) => void): void;
  on(event: "chainChanged", listener: (chainIdHex: string) => void): void;
  removeListener(event: string, listener: (...args: never[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: MetaMaskProvider;
  }
}

export {};

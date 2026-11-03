// Local Ganache chain (see farmy_blockchain/configuration.md).
// Network ID 5777 is what Truffle uses; chain ID 1337 is what MetaMask uses.
export const GANACHE = {
  chainId: 1337,
  chainIdHex: "0x539",
  networkId: "5777",
  name: "Farmy",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:7545",
  currency: { name: "Ether", symbol: "ETH", decimals: 18 },
} as const;

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

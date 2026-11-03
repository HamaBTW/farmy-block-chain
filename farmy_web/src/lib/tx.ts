"use client";

import { useCallback, useState } from "react";
import type { Contract, ContractTransactionResponse, TransactionReceipt } from "ethers";
import { getContract, type ContractName } from "./contracts";
import { useWallet } from "./wallet/WalletProvider";

/** Returns a deployed contract connected to the MetaMask signer. */
export type Signed = (name: ContractName) => Contract;

const ALL: ContractName[] = ["BatchRegistry", "FarmCoin", "PriceCapEscrow"];

/** Runs one or more MetaMask transactions and tracks pending/error state. */
export function useContractTx() {
  const { getSigner, mode } = useWallet();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (steps: (signed: Signed) => Promise<void>): Promise<boolean> => {
      setPending(true);
      setError(null);
      try {
        const signer = await getSigner();
        await steps((name) => {
          const contract = getContract(name, signer);
          if (!contract) throw new Error(`${name} is not deployed.`);
          return contract;
        });
        return true;
      } catch (e) {
        setError(revertMessage(e));
        return false;
      } finally {
        setPending(false);
      }
    },
    [getSigner],
  );

  const pendingLabel = mode === "demo" ? "Sending…" : "Confirm in MetaMask…";
  return { run, pending, error, pendingLabel };
}

/** Sends a transaction and waits for it to be mined. */
export async function mined(tx: Promise<ContractTransactionResponse>): Promise<TransactionReceipt> {
  const receipt = await (await tx).wait();
  if (!receipt) throw new Error("Transaction was not mined.");
  return receipt;
}

/** Prefers the decoded custom error (e.g. "NotInspector()") over the generic RPC message. */
function revertMessage(e: unknown): string {
  const err = e as { revert?: { name: string; args: unknown[] }; shortMessage?: string; message?: string; code?: string };
  if (err.code === "ACTION_REJECTED") return "Transaction rejected in MetaMask.";
  const revert = err.revert ?? decodeRevert(e);
  if (revert) return `Reverted: ${revert.name}(${revert.args.map(String).join(", ")})`;
  return err.shortMessage ?? err.message ?? String(e);
}

/**
 * Wallets nest revert bytes differently (MetaMask: data.data, Ganache: data.result), so search for them
 * and decode with every deployed ABI (an escrow call can revert inside the registry).
 */
function decodeRevert(e: unknown): { name: string; args: unknown[] } | null {
  const abis = ALL.map((name) => getContract(name)?.interface).filter((abi) => abi !== undefined);
  const seen = new Set<unknown>();
  const stack: unknown[] = [e];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    for (const value of Object.values(node)) {
      if (typeof value === "string" && /^0x[0-9a-f]{8}/i.test(value)) {
        for (const abi of abis) {
          try {
            const parsed = abi.parseError(value);
            if (parsed) return { name: parsed.name, args: [...parsed.args] };
          } catch {
            // Known selector but undecodable args: try the next ABI.
          }
        }
      } else if (typeof value === "object") {
        stack.push(value);
      }
    }
  }
  return null;
}

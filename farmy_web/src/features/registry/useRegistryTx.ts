"use client";

import { useCallback, useState } from "react";
import type { Contract, ContractTransactionResponse, Interface, TransactionReceipt } from "ethers";
import { getContract } from "@/lib/contracts";
import { useWallet } from "@/lib/wallet/WalletProvider";

type Send = (registry: Contract) => Promise<ContractTransactionResponse>;

/** Sends one BatchRegistry transaction through MetaMask and tracks its state. */
export function useRegistryTx(onDone?: (receipt: TransactionReceipt, registry: Contract) => void) {
  const { getSigner } = useWallet();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (fn: Send) => {
      setPending(true);
      setError(null);
      const registry = getContract("BatchRegistry");
      try {
        if (!registry) throw new Error("BatchRegistry is not deployed.");
        const signed = registry.connect(await getSigner()) as Contract;
        const receipt = await (await fn(signed)).wait();
        if (receipt) onDone?.(receipt, signed);
      } catch (e) {
        setError(revertMessage(e, registry?.interface));
      } finally {
        setPending(false);
      }
    },
    [getSigner, onDone],
  );

  return { send, pending, error };
}

/** Prefers the decoded custom error (e.g. "NotInspector()") over the generic RPC message. */
function revertMessage(e: unknown, abi?: Interface): string {
  const err = e as { revert?: { name: string; args: unknown[] }; shortMessage?: string; message?: string; code?: string };
  if (err.code === "ACTION_REJECTED") return "Transaction rejected in MetaMask.";
  const revert = err.revert ?? decodeRevert(e, abi);
  if (revert) return `Reverted: ${revert.name}(${revert.args.map(String).join(", ")})`;
  return err.shortMessage ?? err.message ?? String(e);
}

/** Wallets nest revert bytes differently (MetaMask: data.data, Ganache: data.result), so search for them. */
function decodeRevert(e: unknown, abi?: Interface): { name: string; args: unknown[] } | null {
  if (!abi) return null;
  const seen = new Set<unknown>();
  const stack: unknown[] = [e];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    for (const value of Object.values(node)) {
      if (typeof value === "string" && /^0x[0-9a-f]{8}/i.test(value)) {
        try {
          const parsed = abi.parseError(value);
          if (parsed) return { name: parsed.name, args: [...parsed.args] };
        } catch {
          // Known selector but undecodable args: keep searching.
        }
      } else if (typeof value === "object") {
        stack.push(value);
      }
    }
  }
  return null;
}

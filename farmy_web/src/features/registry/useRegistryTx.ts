"use client";

import { useCallback } from "react";
import type { Contract, ContractTransactionResponse, TransactionReceipt } from "ethers";
import { mined, useContractTx } from "@/lib/tx";

type Send = (registry: Contract) => Promise<ContractTransactionResponse>;

/** Sends one BatchRegistry transaction through MetaMask and tracks its state. */
export function useRegistryTx(onDone?: (receipt: TransactionReceipt, registry: Contract) => void) {
  const { run, pending, error } = useContractTx();

  const send = useCallback(
    (fn: Send) =>
      run(async (signed) => {
        const registry = signed("BatchRegistry");
        const receipt = await mined(fn(registry));
        onDone?.(receipt, registry);
      }),
    [run, onDone],
  );

  return { send, pending, error };
}

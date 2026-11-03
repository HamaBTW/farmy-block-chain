"use client";

import { useEffect, useState } from "react";
import type { Contract } from "ethers";
import { getContract } from "@/lib/contracts";
import { loadHistory, type HistoryItem } from "./registry";

/** Read-only BatchRegistry (straight to Ganache), or null if not deployed. */
export function useRegistry(): Contract | null {
  const [registry] = useState(() => getContract("BatchRegistry"));
  return registry;
}

/** Every registry event of one batch, oldest first. */
export function useBatchDetail(registry: Contract | null, id: bigint | null, version: number) {
  const [state, setState] = useState<{ history: HistoryItem[]; error: string | null }>({ history: [], error: null });

  useEffect(() => {
    if (!registry || id === null) return;
    let live = true;
    loadHistory(registry, id)
      .then((history) => live && setState({ history, error: null }))
      .catch((e: Error) => live && setState({ history: [], error: e.message }));
    return () => {
      live = false;
    };
  }, [registry, id, version]);

  return state;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { Contract } from "ethers";
import { getContract } from "@/lib/contracts";
import { loadBatches, loadBatch, loadHistory, type Batch, type HistoryItem } from "./registry";

/** Read-only BatchRegistry (straight to Ganache), or null if not deployed. */
export function useRegistry(): Contract | null {
  const [registry] = useState(() => getContract("BatchRegistry"));
  return registry;
}

/** Bump `version` to refetch after a transaction. */
export function useReload() {
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { version, reload };
}

export function useBatches(registry: Contract | null, version: number) {
  const [state, setState] = useState<{ batches: Batch[]; error: string | null; loaded: boolean }>({
    batches: [],
    error: null,
    loaded: false,
  });

  useEffect(() => {
    if (!registry) return;
    let live = true;
    loadBatches(registry)
      .then((batches) => live && setState({ batches, error: null, loaded: true }))
      .catch((e: Error) => live && setState({ batches: [], error: e.message, loaded: true }));
    return () => {
      live = false;
    };
  }, [registry, version]);

  return state;
}

export function useBatchDetail(registry: Contract | null, id: bigint | null, version: number) {
  const [state, setState] = useState<{ batch: Batch | null; history: HistoryItem[]; error: string | null }>({
    batch: null,
    history: [],
    error: null,
  });

  useEffect(() => {
    if (!registry || id === null) return;
    let live = true;
    Promise.all([loadBatch(registry, id), loadHistory(registry, id)])
      .then(([batch, history]) => live && setState({ batch, history, error: null }))
      .catch((e: Error) => live && setState({ batch: null, history: [], error: e.message }));
    return () => {
      live = false;
    };
  }, [registry, id, version]);

  return state;
}

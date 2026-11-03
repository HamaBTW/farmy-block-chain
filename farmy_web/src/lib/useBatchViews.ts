"use client";

import { useEffect, useState } from "react";
import { getContract } from "./contracts";
import { loadAllBatchViews, loadBatchView, type BatchView } from "./journeyData";

type Many = { batches: BatchView[]; loaded: boolean; error: string | null };
type One = { batch: BatchView | null; loaded: boolean; error: string | null };

/** Every batch with its open sale, refreshed when `version` changes. */
export function useBatchViews(version: number): Many {
  const [state, setState] = useState<Many>({ batches: [], loaded: false, error: null });

  useEffect(() => {
    const registry = getContract("BatchRegistry");
    if (!registry) return;
    let live = true;
    loadAllBatchViews(registry, getContract("PriceCapEscrow"))
      .then((batches) => live && setState({ batches, loaded: true, error: null }))
      .catch((e: Error) => live && setState({ batches: [], loaded: true, error: e.message }));
    return () => {
      live = false;
    };
  }, [version]);

  return state;
}

/** One batch with its open sale; `batch` stays null for an id that was never minted. */
export function useBatchView(batchId: bigint, version: number): One {
  const [state, setState] = useState<One>({ batch: null, loaded: false, error: null });

  useEffect(() => {
    const registry = getContract("BatchRegistry");
    if (!registry) return;
    let live = true;
    loadBatchView(registry, getContract("PriceCapEscrow"), batchId)
      .then((batch) => live && setState({ batch, loaded: true, error: null }))
      .catch(() => live && setState({ batch: null, loaded: true, error: null }));
    return () => {
      live = false;
    };
  }, [batchId, version]);

  return state;
}

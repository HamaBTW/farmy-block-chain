"use client";

import { useCallback, useEffect, useState } from "react";
import { getReadProvider } from "./contracts";

/**
 * A counter that changes on every new Ganache block and on `reload()`.
 * Put it in effect deps to refetch contract state after any transaction, from any account or tab.
 */
export function useChainVersion() {
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const provider = getReadProvider();
    // Own listener per effect run: ethers' on/off are async, so a shared function could be
    // removed by a late `off` from a previous run (React dev mounts effects twice).
    const onBlock = () => reload();
    provider.on("block", onBlock);
    return () => {
      provider.off("block", onBlock);
    };
  }, [reload]);

  return { version, reload };
}

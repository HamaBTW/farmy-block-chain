"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { KIND_NAMES } from "@/lib/assetLabel";
import { getContract } from "@/lib/contracts";
import { loadChildren, loadHarvests, type BatchView } from "@/lib/journeyData";

/** Where a lot comes from (land, parent lot) and what came out of it (child lots, or a land's harvests). */
export function FamilyTree({ batch, version }: { batch: BatchView; version: number }) {
  const [below, setBelow] = useState<bigint[]>([]);

  useEffect(() => {
    const registry = getContract("BatchRegistry");
    if (!registry || batch.kind === "machine") return;
    let live = true;
    const load = batch.kind === "land" ? loadHarvests(registry, batch.batchId) : loadChildren(registry, batch.batchId);
    load.then((ids) => live && setBelow(ids)).catch(() => {});
    return () => {
      live = false;
    };
  }, [batch.batchId, batch.kind, version]);

  if (batch.kind === "machine") return null;
  const link = (id: bigint, text: string) => (
    <Link href={`/batch/${id}`} className="font-semibold text-sky underline">
      {text} #{id.toString()}
    </Link>
  );

  return (
    <Card className="space-y-2">
      <h2 className="font-display text-xl font-bold">Family tree</h2>
      <ul className="space-y-1 text-sm">
        {batch.landId > BigInt(0) && <li>🌍 From {link(batch.landId, "land")}</li>}
        {batch.parentId > BigInt(0) && <li>✂️ Split from {link(batch.parentId, "lot")}</li>}
        <li className="font-semibold">
          ➜ This {KIND_NAMES[batch.kind].toLowerCase()} #{batch.batchId.toString()}
        </li>
        {below.map((id) => (
          <li key={id.toString()} className="pl-5">
            {batch.kind === "land" ? "🌾 Harvested" : "✂️ Split into"} {link(id, "lot")}
          </li>
        ))}
        {below.length === 0 && <li className="pl-5 text-ink-soft">{batch.kind === "land" ? "No harvests yet." : "Not split."}</li>}
      </ul>
    </Card>
  );
}

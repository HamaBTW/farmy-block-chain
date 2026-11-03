"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getContract } from "@/lib/contracts";
import { canDo, nextSteps, primaryStep, STEP_PHRASES, type Step } from "@/lib/journey";
import type { BatchView } from "@/lib/journeyData";
import { productEmoji } from "@/lib/metadata";
import { hasChainRole, usePeople } from "@/lib/people/PeopleProvider";
import { personForWho } from "@/lib/people/resolveWho";
import { useBatchViews } from "@/lib/useBatchViews";
import { useChainVersion } from "@/lib/useChainVersion";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { batchDocOf } from "./ui/BatchChips";
import { Button } from "./ui/Button";

const HIDDEN_ON = ["/batch/", "/guide"];

/** The single most useful next action for the acting person, across all batches. */
export function NextStepBanner() {
  const pathname = usePathname();
  const { version } = useChainVersion();
  const { batches, loaded } = useBatchViews(version);
  const { account, mode, actAs } = useWallet();
  const { people, chainRoles } = usePeople();

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  if (!getContract("BatchRegistry")) {
    return (
      <Banner tone="beet">
        The contracts aren&apos;t deployed on Ganache yet. <Link className="font-semibold underline" href="/guide#setup">See the setup steps</Link>
      </Banner>
    );
  }
  if (!loaded || batches.length === 0 || !account) return null;

  const isInspector = hasChainRole(chainRoles, "inspector", account);
  const withStep = batches.map((b) => ({ b, step: primaryStep(nextSteps(b)) })).filter((x): x is { b: BatchView; step: Step } => !!x.step);
  const mine = withStep.find((x) => canDo(x.step, account, isInspector));
  if (mine) {
    return (
      <Banner tone="sky">
        <span>
          {label(mine.b)}: your turn to {STEP_PHRASES[mine.step.action]}.
        </span>
        <Link href={`/batch/${mine.b.batchId}`} className="inline-flex h-9 items-center rounded-xl bg-field px-3 text-sm font-semibold text-field-ink">
          Open batch
        </Link>
      </Banner>
    );
  }

  const waiting = withStep[0];
  if (!waiting) return null;
  const target = personForWho(waiting.step.who, people, chainRoles);
  return (
    <Banner tone="sky">
      <span>
        {label(waiting.b)} waits for {target ? `${target.emoji} ${target.name}` : "an inspector"} to {STEP_PHRASES[waiting.step.action]}.
      </span>
      {mode === "demo" && target && (
        <Button size="sm" onClick={() => actAs(target.address)}>
          Switch to {target.name}
        </Button>
      )}
    </Banner>
  );
}

function label(b: BatchView): string {
  const doc = batchDocOf(b.uri);
  return doc ? `${productEmoji(doc.product)} ${doc.product} (batch #${b.batchId})` : `Batch #${b.batchId}`;
}

function Banner({ tone, children }: { tone: "sky" | "beet"; children: React.ReactNode }) {
  return (
    <div className={tone === "sky" ? "bg-sky-wash" : "bg-beet-wash"}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">{children}</div>
    </div>
  );
}

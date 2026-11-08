"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { BatchChips, assetDocOf } from "@/components/ui/BatchChips";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PersonName } from "@/components/ui/PersonName";
import { PersonPicker } from "@/components/ui/PersonPicker";
import { sortStamps, StampList, type StampItem } from "@/components/ui/Stamp";
import { Tag } from "@/components/ui/Tag";
import { TxButton } from "@/components/ui/TxButton";
import { downloadDoc, getDoc, saveDoc } from "@/lib/docStore";
import { formatFrm } from "@/lib/format";
import { canDo, nextSteps, primaryStep, REGISTRY_ACTIONS, STEP_PHRASES, type Step } from "@/lib/journey";
import type { BatchView, SaleContext } from "@/lib/journeyData";
import { hashDoc, hashFromUri, parseDoc } from "@/lib/metadata";
import { findPerson } from "@/lib/people";
import { hasChainRole, usePeople } from "@/lib/people/PeopleProvider";
import { personForWho } from "@/lib/people/resolveWho";
import { mined } from "@/lib/tx";
import { useBatchView } from "@/lib/useBatchViews";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { CheckpointForm } from "./CheckpointForm";
import { FamilyTree } from "./FamilyTree";
import { HarvestForm } from "./HarvestForm";
import type { HistoryItem } from "./registry";
import { SplitForm } from "./SplitForm";
import { useBatchDetail, useRegistry } from "./useRegistry";

type Props = {
  batchId: bigint;
  version: number;
  reload: () => void;
  /** Market events of this batch (from B), merged into the timeline. */
  saleStamps: StampItem[];
  /** Market steps of this batch (from B), shown in the Next step card. */
  salePanel: (ctx: SaleContext) => ReactNode;
};

/** Person A: one batch's journey: the tag, what happens next, and every stamp so far. */
export function BatchJourney({ batchId, version, reload, saleStamps, salePanel }: Props) {
  const registry = useRegistry();
  const { batch, loaded } = useBatchView(batchId, version);
  const { history } = useBatchDetail(registry, batchId, version);
  const [loadedAt] = useState(() => Math.floor(Date.now() / 1000));
  const [docVersion, setDocVersion] = useState(0);

  const stamps = useMemo(() => {
    const doc = batch ? assetDocOf(batch.uri) : null;
    const unit = doc?.schema === "farmy.batch.v1" ? doc.unit : "units";
    return sortStamps([...registryStamps(history, batchId, unit), ...saleStamps]);
  }, [history, saleStamps, batch, batchId]);
  const fresh = useMemo(() => new Set(stamps.filter((s) => s.timestamp >= loadedAt).map((s) => s.key)), [stamps, loadedAt]);

  if (loaded && !batch) {
    return (
      <Card>
        <h1 className="font-display text-2xl font-bold">Asset #{batchId.toString()} doesn&apos;t exist</h1>
        <Link href="/registry" className="mt-2 inline-block font-semibold text-sky underline">
          Back to the farm
        </Link>
      </Card>
    );
  }
  if (!batch) return <p className="text-ink-soft">Loading #{batchId.toString()}…</p>;

  // docVersion: re-render after a successful "Verify a file" so the tag reads the stored details.
  const hasDoc = docVersion >= 0 && !!assetDocOf(batch.uri);

  return (
    <div className="space-y-6">
      <Link href="/registry" className="text-sm font-semibold text-ink-soft hover:text-ink">
        ← Farm
      </Link>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-5">
          <Tag size="lg" batch={batch} chips={<BatchChips batch={batch} />} />
          <DetailsActions uri={batch.uri} hasDoc={hasDoc} batchId={batch.batchId} onVerified={() => setDocVersion((v) => v + 1)} />
          <NextStep batch={batch} onDone={reload} salePanel={salePanel} />
          <FamilyTree batch={batch} version={version} />
        </div>
        <Card className="lg:col-span-7">
          <h2 className="mb-4 font-display text-xl font-bold">Journey</h2>
          <StampList items={stamps} fresh={fresh} />
        </Card>
      </div>
    </div>
  );
}

function NextStep({ batch, onDone, salePanel }: { batch: BatchView; onDone: () => void; salePanel: (ctx: SaleContext) => ReactNode }) {
  const { account, isOnGanache, mode, actAs } = useWallet();
  const { people, chainRoles } = usePeople();
  const isInspector = hasChainRole(chainRoles, "inspector", account);
  const steps = nextSteps(batch);
  const primary = primaryStep(steps);
  const mine = steps.filter((s) => canDo(s, account, isInspector));
  const registrySteps = mine.filter((s) => REGISTRY_ACTIONS.includes(s.action));
  const saleSteps = mine.filter((s) => !REGISTRY_ACTIONS.includes(s.action));
  const saleFirst = saleSteps.some((s) => s.primary);
  const waitingFor = primary && !canDo(primary, account, isInspector) ? primary : null;
  const target = waitingFor ? personForWho(waitingFor.who, people, chainRoles) : undefined;
  const regulator = findPerson(people, chainRoles.regulator);

  return (
    <Card className="space-y-4">
      <h2 className="font-display text-xl font-bold">Next step</h2>
      {batch.closed && <p className="text-sm text-ink-soft">This lot was split into smaller lots. Each one has its own journey: see the family tree.</p>}
      {!account || !isOnGanache ? (
        <p className="text-sm text-ink-soft">Choose who you are in the top right corner to act on this asset.</p>
      ) : (
        <>
          {waitingFor && (
            <div className="rounded-xl bg-sky-wash p-3 text-sm">
              {waitingFor.who.kind === "inspector" && !target ? (
                <p>
                  No one is an inspector yet. {regulator ? `${regulator.emoji} ${regulator.name}` : "The regulator"} can make someone an inspector in
                  Farm → Regulator tools.
                </p>
              ) : (
                <p>
                  Waiting for <b>{target ? `${target.emoji} ${target.name}` : "someone else"}</b> to {STEP_PHRASES[waitingFor.action]}.
                </p>
              )}
              {mode === "demo" && (target ?? (waitingFor.who.kind === "inspector" ? regulator : undefined)) && (
                <Button size="sm" className="mt-2" onClick={() => actAs((target ?? regulator)!.address)}>
                  Switch to {(target ?? regulator)!.name}
                </Button>
              )}
            </div>
          )}
          {/* The primary step comes first, whichever side (registry or market) owns it. */}
          {saleFirst && salePanel({ batch, steps: saleSteps, me: account, onDone })}
          {registrySteps.map((s) => (
            <RegistryStep key={s.action} step={s} batch={batch} onDone={onDone} />
          ))}
          {!saleFirst && salePanel({ batch, steps: saleSteps, me: account, onDone })}
          {mine.length === 0 && !waitingFor && <p className="text-sm text-ink-soft">Nothing for you to do on this asset right now.</p>}
        </>
      )}
    </Card>
  );
}

function RegistryStep({ step, batch, onDone }: { step: Step; batch: BatchView; onDone: () => void }) {
  const [to, setTo] = useState("");
  const variant = step.primary ? "primary" : "secondary";

  if (step.action === "validate") {
    return (
      <details className="rounded-xl border border-line p-3" open={step.primary}>
        <summary className="cursor-pointer text-sm font-semibold">✅ Check and validate</summary>
        <p className="mt-2 text-xs text-ink-soft">Your check is recorded first, then the {batch.kind} is validated, in one transaction.</p>
        <div className="mt-3">
          <CheckpointForm batchId={batch.batchId} validate onDone={onDone} />
        </div>
      </details>
    );
  }
  if (step.action === "addCheckpoint") {
    return (
      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">📋 Add a checkpoint only</summary>
        <div className="mt-3">
          <CheckpointForm batchId={batch.batchId} onDone={onDone} />
        </div>
      </details>
    );
  }
  if (step.action === "harvest") {
    return (
      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">🌾 Harvest a lot</summary>
        <div className="mt-3">
          <HarvestForm landId={batch.batchId} onDone={onDone} />
        </div>
      </details>
    );
  }
  if (step.action === "split") {
    return (
      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">✂️ Split into smaller lots</summary>
        <div className="mt-3">
          <SplitForm lot={batch} onDone={onDone} />
        </div>
      </details>
    );
  }
  return (
    <details className="rounded-xl border border-line p-3" open={step.primary}>
      <summary className="cursor-pointer text-sm font-semibold">🤝 Hand over to someone</summary>
      <div className="mt-3 space-y-3">
        <PersonPicker label="Who receives the goods" value={to} onChange={setTo} exclude={[batch.custodian]} />
        <TxButton
          label="Hand over"
          done="Handed over"
          variant={variant}
          disabled={!to}
          send={(signed) => mined(signed("BatchRegistry").transferCustody(batch.batchId, to))}
          onDone={() => {
            setTo("");
            onDone();
          }}
        />
      </div>
    </details>
  );
}

/** Download the off-chain details, or check a JSON file against the on-chain fingerprint. */
function DetailsActions({ uri, hasDoc, batchId, onVerified }: { uri: string; hasDoc: boolean; batchId: bigint; onVerified: () => void }) {
  const [result, setResult] = useState<"match" | "nomatch" | null>(null);
  const hash = hashFromUri(uri);
  if (!hash) return <p className="text-xs text-ink-soft">Metadata: <span className="font-mono">{uri || "none"}</span></p>;

  if (hasDoc) {
    const doc = getDoc(hash)!;
    return (
      <Button size="sm" onClick={() => downloadDoc(doc, `farmy-batch-${batchId}.json`)}>
        Download details (JSON)
      </Button>
    );
  }
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold">Have the details file?</span>
      <input
        type="file"
        accept="application/json,.json"
        className="text-sm"
        onChange={async (e) => {
          const text = await e.target.files?.[0]?.text();
          const doc = text ? parseDoc(text) : null;
          const ok = !!doc && hashDoc(doc) === hash;
          setResult(ok ? "match" : "nomatch");
          if (ok) {
            saveDoc(doc);
            onVerified();
          }
        }}
      />
      {result === "match" && <Chip tone="field">Matches the asset</Chip>}
      {result === "nomatch" && <Chip tone="beet">Doesn&apos;t match this asset</Chip>}
    </label>
  );
}

/** Registry events as stamps. A token's first PriceRecorded is folded into its creation stamp. */
function registryStamps(history: HistoryItem[], id: bigint, unit: string): StampItem[] {
  const self = id.toString();
  const createdTx = new Set(history.filter((h) => h.kind === "AssetRegistered" && h.args.batchId === self).map((h) => h.txHash));
  const coveredTx = new Set(
    history.filter((h) => (h.kind === "LotHarvested" && h.args.batchId === self) || (h.kind === "LotSplit" && h.args.childId === self)).map((h) => h.txHash),
  );
  const firstPrice = new Map(history.filter((h) => h.kind === "PriceRecorded" && createdTx.has(h.txHash)).map((h) => [h.txHash, h.args.price]));
  const withPrice = (tx: string, text: string) => (firstPrice.has(tx) ? `${text} · first price ${formatFrm(firstPrice.get(tx)!)}` : text);
  const lotLink = (lot: string) => (
    <Link href={`/batch/${lot}`} className="underline">
      lot #{lot}
    </Link>
  );

  return history.flatMap((h): StampItem[] => {
    const base = { key: `r-${h.blockNumber}-${h.logIndex}`, blockNumber: h.blockNumber, logIndex: h.logIndex, timestamp: h.timestamp };
    switch (h.kind) {
      case "AssetRegistered":
        return coveredTx.has(h.txHash)
          ? []
          : [{ ...base, emoji: "🌱", tone: "field", title: <>Registered to <PersonName address={h.args.to} showAddress={false} /></>, detail: withPrice(h.txHash, "On the farm") }];
      case "LotHarvested":
        return h.args.batchId === self
          ? [{ ...base, emoji: "🌾", tone: "field", title: <>Harvested from <Link href={`/batch/${h.args.landId}`} className="underline">land #{h.args.landId}</Link></>, detail: withPrice(h.txHash, `${h.args.quantity} ${unit}`) }]
          : [{ ...base, emoji: "🌾", tone: "field", title: <>Harvested {lotLink(h.args.batchId)}</>, detail: `${h.args.quantity} units` }];
      case "LotSplit":
        return h.args.childId === self
          ? [{ ...base, emoji: "✂️", tone: "sky", title: <>Split from {lotLink(h.args.batchId)}</>, detail: withPrice(h.txHash, `${h.args.quantity} ${unit}`) }]
          : [{ ...base, emoji: "✂️", tone: "sky", title: <>Split off {lotLink(h.args.childId)}</>, detail: `${h.args.quantity} ${unit}` }];
      case "CustodyTransferred":
        return [{ ...base, emoji: "🤝", tone: "sky", title: <>Handed to <PersonName address={h.args.to} showAddress={false} /></>, detail: <>from <PersonName address={h.args.from} showAddress={false} /></> }];
      case "CheckpointAdded":
        return [{ ...base, emoji: "📋", tone: "sky", title: <>Checked by <PersonName address={h.args.inspector} showAddress={false} /></>, detail: checkpointDetail(h.args.dataHash) }];
      case "BatchValidated":
        return [{ ...base, emoji: "✅", tone: "field", title: <>Validated by <PersonName address={h.args.inspector} showAddress={false} /></> }];
      case "PriceRecorded":
        return createdTx.has(h.txHash) ? [] : [{ ...base, emoji: "📈", tone: "field", title: `New last price ${formatFrm(h.args.price)}` }];
    }
  });
}

function checkpointDetail(dataHash: string): string {
  const doc = getDoc(dataHash);
  if (doc?.schema !== "farmy.checkpoint.v1") return "Record kept off-chain";
  return [`${doc.weightKg} kg`, `${doc.temperatureC} °C`, doc.location, doc.note].filter(Boolean).join(" · ");
}

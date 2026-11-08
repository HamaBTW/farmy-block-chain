import type { ReactNode } from "react";
import type { Tone } from "./Chip";

/** One event of a batch's journey. Registry and market screens both produce these. */
export type StampItem = {
  key: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number;
  emoji: string;
  tone: Exclude<Tone, "plain">;
  title: ReactNode;
  detail?: ReactNode;
};

const RING: Record<StampItem["tone"], string> = {
  field: "border-field bg-field-wash",
  harvest: "border-harvest bg-harvest-wash",
  beet: "border-beet bg-beet-wash",
  sky: "border-sky bg-sky-wash",
};

export function sortStamps(items: StampItem[]): StampItem[] {
  return [...items].sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
}

/** The journey as a column of ink stamps. A stamp that appeared after the page loaded lands with one small thunk. */
export function StampList({ items, fresh }: { items: StampItem[]; fresh: Set<string> }) {
  if (items.length === 0) return <p className="text-sm text-ink-soft">Nothing has happened to this asset yet.</p>;
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-px before:bg-line">
      {items.map((s) => (
        <li key={s.key} className="relative flex gap-4">
          <span
            aria-hidden
            className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 text-lg ${RING[s.tone]} ${fresh.has(s.key) ? "stamp-in" : ""}`}
            style={{ transform: "rotate(-2deg)" }}
          >
            {s.emoji}
          </span>
          <div className="min-w-0 pt-1">
            <p className="font-semibold leading-snug">{s.title}</p>
            {s.detail && <div className="mt-0.5 text-sm text-ink-soft">{s.detail}</div>}
            <p className="mt-0.5 text-xs text-ink-soft">
              {s.timestamp ? new Date(s.timestamp * 1000).toLocaleString() : ""} · block {s.blockNumber}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

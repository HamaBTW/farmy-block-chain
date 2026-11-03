import type { ReactNode } from "react";

export type Tone = "field" | "harvest" | "beet" | "sky" | "plain";

const TONES: Record<Tone, string> = {
  field: "bg-field-wash text-field",
  harvest: "bg-harvest-wash text-harvest-ink",
  beet: "bg-beet-wash text-beet",
  sky: "bg-sky-wash text-sky",
  plain: "bg-paper text-ink-soft border border-line",
};

/** Small status pill. Colors follow the status mapping in DESIGN_SYSTEM.md §2. */
export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

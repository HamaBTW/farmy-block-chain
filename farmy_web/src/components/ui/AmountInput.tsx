"use client";

import { formatUnits, parseUnits } from "ethers";
import { formatFrm } from "@/lib/format";

type Quick = { label: string; value: bigint };

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  quick?: Quick[];
  hint?: React.ReactNode;
};

/** FRM amount with quick-pick chips. Value is the human amount ("115"), not base units. */
export function AmountInput({ label, value, onChange, quick = [], hint }: Props) {
  const current = parseFrm(value);
  return (
    <div className="space-y-2">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink-soft">{label}</span>
        <span className="flex items-center rounded-xl border border-line bg-card pr-3 focus-within:outline focus-within:outline-2 focus-within:outline-sky">
          <input
            className="w-full rounded-xl bg-transparent px-3 py-2.5 text-lg font-semibold tabular outline-none"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="text-sm font-semibold text-ink-soft">FRM</span>
        </span>
      </label>
      {quick.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              aria-pressed={current === q.value}
              onClick={() => onChange(formatUnits(q.value, 18).replace(/\.0$/, ""))}
              className={`h-9 rounded-full border px-3 text-sm font-medium ${current === q.value ? "border-field bg-field text-field-ink" : "border-line bg-card hover:bg-field-wash"}`}
            >
              {q.label} · {formatFrm(q.value)}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

/** "115.5" → base units, or null if it isn't a positive number. */
export function parseFrm(value: string): bigint | null {
  try {
    const v = parseUnits(value.trim() || "0", 18);
    return v > BigInt(0) ? v : null;
  } catch {
    return null;
  }
}

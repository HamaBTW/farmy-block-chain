import type { ReactNode } from "react";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

/** A row of quick-pick pills (product, origin, amounts). */
export function Choices<T extends string>({ options, value, onChange, render }: { options: T[]; value: T; onChange: (v: T) => void; render?: (v: T) => ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={`h-9 rounded-full border px-3 text-sm font-medium ${o === value ? "border-field bg-field text-field-ink" : "border-line bg-card hover:bg-field-wash"}`}
        >
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { isAddress } from "ethers";
import { findPerson } from "@/lib/people";
import { usePeople } from "@/lib/people/PeopleProvider";

type Props = {
  label: string;
  value: string;
  onChange: (address: string) => void;
  exclude?: string[];
};

/** Choose an address by person instead of pasting it. "Other address…" still allows any address. */
export function PersonPicker({ label, value, onChange, exclude = [] }: Props) {
  const { people } = usePeople();
  const excluded = new Set(exclude.map((a) => a.toLowerCase()));
  const choices = people.filter((p) => !excluded.has(p.address.toLowerCase()));
  const [other, setOther] = useState(() => (value && !findPerson(people, value) ? value : ""));
  const [typing, setTyping] = useState(() => !!value && !findPerson(people, value));
  const selected = value.toLowerCase();

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium text-ink-soft">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((p) => {
          const on = !typing && p.address.toLowerCase() === selected;
          return (
            <button
              key={p.address}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setTyping(false);
                onChange(p.address);
              }}
              className={`h-9 rounded-full border px-3 text-sm font-medium ${on ? "border-field bg-field text-field-ink" : "border-line bg-card hover:bg-field-wash"}`}
            >
              {p.emoji} {p.name}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={typing}
          onClick={() => {
            setTyping(true);
            onChange(other);
          }}
          className={`h-9 rounded-full border px-3 text-sm font-medium ${typing ? "border-field bg-field text-field-ink" : "border-dashed border-line hover:bg-field-wash"}`}
        >
          Other address…
        </button>
      </div>
      {typing && (
        <div>
          <input
            className="input font-mono"
            value={other}
            placeholder="0x…"
            onChange={(e) => {
              setOther(e.target.value);
              onChange(e.target.value.trim());
            }}
          />
          {other && !isAddress(other.trim()) && <p className="mt-1 text-xs text-beet">That isn&apos;t a valid address.</p>}
        </div>
      )}
    </fieldset>
  );
}

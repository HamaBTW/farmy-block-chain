"use client";

import { findPerson, shortAddress } from "@/lib/people";
import { usePeople } from "@/lib/people/PeopleProvider";
import { useToast } from "./Toast";

/** An address shown as a person: emoji + name, then the short address and a copy button. */
export function PersonName({ address, showAddress = true }: { address: string; showAddress?: boolean }) {
  const { people } = usePeople();
  const { show } = useToast();
  const person = findPerson(people, address);

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 align-middle">
      {person && (
        <span className="font-semibold">
          {person.emoji} {person.name}
        </span>
      )}
      {(showAddress || !person) && (
        <button
          type="button"
          title="Copy address"
          className="rounded-md px-1 font-mono text-xs text-ink-soft hover:bg-field-wash"
          onClick={() => navigator.clipboard?.writeText(address).then(() => show("Address copied"))}
        >
          {shortAddress(address)}
        </button>
      )}
    </span>
  );
}

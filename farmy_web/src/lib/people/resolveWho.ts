import type { Who } from "../journey";
import { findPerson, type Person } from "../people";

type Roles = { inspectors: string[] };

/** The demo person who can do a step (for "Waiting for X" and "Switch to X"), if there is one. */
export function personForWho(who: Who, people: Person[], roles: Roles): Person | undefined {
  switch (who.kind) {
    case "address":
      return findPerson(people, who.address);
    case "inspector":
      return roles.inspectors.map((a) => findPerson(people, a)).find(Boolean);
    case "notSeller": {
      const seller = who.seller.toLowerCase();
      return people.find((p) => p.role === "buyer" && p.address.toLowerCase() !== seller) ?? people.find((p) => p.address.toLowerCase() !== seller);
    }
    case "anyone":
      return undefined;
  }
}

export type PersonRole = "regulator" | "inspector" | "farmer" | "transporter" | "warehouse" | "buyer" | "retailer" | "guest";
export type Person = { address: string; index: number; name: string; emoji: string; role: PersonRole };

/** Default demo cast, by Ganache account index (same order as test/integration/lifecycle.test.js). */
const CAST: { name: string; emoji: string; role: PersonRole }[] = [
  { name: "Regulator", emoji: "🏛️", role: "regulator" },
  { name: "Inspector", emoji: "🔍", role: "inspector" },
  { name: "Farmer", emoji: "🚜", role: "farmer" },
  { name: "Transporter", emoji: "🚚", role: "transporter" },
  { name: "Warehouse", emoji: "🏬", role: "warehouse" },
  { name: "Buyer", emoji: "🛒", role: "buyer" },
  { name: "Retailer", emoji: "🧺", role: "retailer" },
];

/** What each role does, in plain words (People page and guide). */
export const ROLE_JOBS: Record<PersonRole, string> = {
  regulator: "Adds inspectors, registers land and machines, and, as market authority, sets the max markup.",
  inspector: "Checks land, machines and lots on the way, and validates them.",
  farmer: "Holds the land and harvests lots of produce from it.",
  transporter: "Carries lots between places.",
  warehouse: "Stores lots, splits them and sells them on the market.",
  buyer: "Buys FRM with ETH, pays into escrow and receives the goods.",
  retailer: "Can buy and resell batches.",
  guest: "A spare account for experiments.",
};

export function buildPeople(accounts: string[], renames: Record<string, string>): Person[] {
  const lowerRenames = Object.fromEntries(Object.entries(renames).map(([a, n]) => [a.toLowerCase(), n]));
  return accounts.map((address, index) => {
    const cast = CAST[index] ?? { name: `Guest ${index - CAST.length + 1}`, emoji: "👤", role: "guest" as const };
    return { address, index, emoji: cast.emoji, role: cast.role, name: lowerRenames[address.toLowerCase()] ?? cast.name };
  });
}

export function findPerson(people: Person[], address: string | null | undefined): Person | undefined {
  if (!address) return undefined;
  const a = address.toLowerCase();
  return people.find((p) => p.address.toLowerCase() === a);
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function personLabel(people: Person[], address: string): string {
  const p = findPerson(people, address);
  return p ? `${p.emoji} ${p.name}` : shortAddress(address);
}

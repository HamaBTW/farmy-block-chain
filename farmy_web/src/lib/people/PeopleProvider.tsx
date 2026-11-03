"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getContract, getReadProvider } from "../contracts";
import { buildPeople, type Person } from "../people";
import { useChainVersion } from "../useChainVersion";

const STORAGE_KEY = "farmy.people.v1";

type ChainRoles = { regulator: string | null; authority: string | null; inspectors: string[] };

type PeopleState = {
  people: Person[];
  loaded: boolean;
  chainRoles: ChainRoles;
  rename: (address: string, name: string) => void;
  reset: () => void;
};

const PeopleContext = createContext<PeopleState | null>(null);

/** The demo cast: Ganache's own accounts with role names (renamable, saved in this browser) and their live roles. */
export function PeopleProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Read once on the client. The first render has no accounts yet, so server and client markup still match.
  const [renames, setRenames] = useState<Record<string, string>>(() => (typeof window === "undefined" ? {} : readRenames()));
  const [chainRoles, setChainRoles] = useState<ChainRoles>({ regulator: null, authority: null, inspectors: [] });
  const { version } = useChainVersion();

  useEffect(() => {
    getReadProvider()
      .send("eth_accounts", [])
      .then((list: string[]) => setAccounts(list))
      .catch(() => setAccounts([]))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const registry = getContract("BatchRegistry");
    const escrow = getContract("PriceCapEscrow");
    if (!accounts.length) return;
    let live = true;
    Promise.all([
      registry ? registry.owner() : null,
      escrow ? escrow.owner() : null,
      registry ? Promise.all(accounts.map((a) => registry.isInspector(a))) : accounts.map(() => false),
    ])
      .then(([regulator, authority, flags]: [string | null, string | null, boolean[]]) => {
        if (live) setChainRoles({ regulator, authority, inspectors: accounts.filter((_, i) => flags[i]) });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [accounts, version]);

  const rename = useCallback((address: string, name: string) => {
    setRenames((current) => {
      const next = { ...current, [address.toLowerCase()]: name.trim() };
      if (!name.trim()) delete next[address.toLowerCase()];
      writeRenames(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    writeRenames({});
    setRenames({});
  }, []);

  const people = useMemo(() => buildPeople(accounts, renames), [accounts, renames]);
  const value = useMemo(() => ({ people, loaded, chainRoles, rename, reset }), [people, loaded, chainRoles, rename, reset]);
  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople(): PeopleState {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error("usePeople must be used inside <PeopleProvider>.");
  return ctx;
}

/** True when `address` has `role` on-chain right now. */
export function hasChainRole(roles: ChainRoles, role: "regulator" | "authority" | "inspector", address: string | null): boolean {
  if (!address) return false;
  const a = address.toLowerCase();
  if (role === "inspector") return roles.inspectors.some((i) => i.toLowerCase() === a);
  return roles[role]?.toLowerCase() === a;
}

function readRenames(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function writeRenames(renames: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(renames));
  } catch {
    // Storage blocked (private mode): names just won't be remembered.
  }
}

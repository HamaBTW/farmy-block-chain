"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { GANACHE } from "@/lib/chain";
import { ERROR_HELP } from "@/lib/errors";
import { ROLE_JOBS, type PersonRole } from "@/lib/people";
import { usePeople } from "@/lib/people/PeopleProvider";
import { useWallet } from "@/lib/wallet/WalletProvider";

type StoryStep = { role: PersonRole; text: string; where: { href: string; label: string } };

/** farmy_idea1.md §7, plus the one-time setup the regulator does first. */
const STORY: StoryStep[] = [
  { role: "regulator", text: "Make the Inspector an inspector (Regulator tools), then mint 1000 FRM for the Buyer (Market authority tools).", where: { href: "/registry", label: "Batches" } },
  { role: "farmer", text: "Add a batch of tomatoes with a first price of 100 FRM.", where: { href: "/registry", label: "Batches" } },
  { role: "farmer", text: "Open the batch and hand it over to the Transporter.", where: { href: "/registry", label: "Batches" } },
  { role: "inspector", text: "Open the batch, add a checkpoint (weight, temperature, place), then validate it.", where: { href: "/registry", label: "Batches" } },
  { role: "transporter", text: "Hand the batch to the Warehouse.", where: { href: "/registry", label: "Batches" } },
  { role: "warehouse", text: "List it for 150 FRM: the escrow refuses, because the cap is 120 FRM (100 + 20%). Then list it for 115 FRM.", where: { href: "/registry", label: "Batches" } },
  { role: "buyer", text: "Buy it: one click approves and pays 115 FRM into escrow.", where: { href: "/market", label: "Market" } },
  { role: "warehouse", text: "Hand the goods to the Buyer. Anyone can now release the payment, and 115 FRM becomes the new last price.", where: { href: "/market", label: "Market" } },
];

const SECTIONS = [
  { id: "setup", title: "Setup" },
  { id: "people", title: "Meet the people" },
  { id: "story", title: "The story" },
  { id: "rules", title: "The rules" },
  { id: "errors", title: "What errors mean" },
];

/** Shared: how to run the demo and what everything means. */
export function GuideHome() {
  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
      <nav className="lg:sticky lg:top-6 lg:self-start" aria-label="Guide sections">
        <h1 className="font-display text-3xl font-bold">Guide</h1>
        <ol className="mt-3 space-y-1 text-sm">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="font-semibold text-ink-soft hover:text-ink">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="max-w-3xl space-y-10">
        <Setup />
        <People />
        <Story />
        <Rules />
        <Errors />
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Setup() {
  const { hasMetaMask, mode, setMode, demoAvailable, switchToGanache } = useWallet();
  return (
    <Section id="setup" title="Setup">
      <ol className="list-decimal space-y-3 pl-5">
        <li>
          Start <b>Ganache</b> with RPC <code className="font-mono text-sm">{GANACHE.rpcUrl}</code>, network id {GANACHE.networkId} and chain id {GANACHE.chainId}.
        </li>
        <li>
          Deploy the contracts: in <code className="font-mono text-sm">farmy_blockchain</code> run <code className="font-mono text-sm">npm run migrate</code>, then reload this page.
        </li>
        <li>
          Choose how to sign:
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Card className="space-y-2">
              <p className="font-semibold">Demo mode {mode === "demo" && "(on)"}</p>
              <p className="text-sm text-ink-soft">
                Act as any Ganache person from the menu in the top right. Ganache signs for its own accounts, so nothing needs importing. Only works on the
                local chain.
              </p>
              {mode !== "demo" && demoAvailable && <Button size="sm" onClick={() => setMode("demo")}>Use Demo mode</Button>}
            </Card>
            <Card className="space-y-2">
              <p className="font-semibold">MetaMask {mode === "metamask" && "(on)"}</p>
              <p className="text-sm text-ink-soft">
                In Ganache, click the key icon next to an account and copy its private key. In MetaMask choose <i>Add account → Import account</i> and paste it.
                Farmy never asks for keys. Switch accounts in MetaMask to change person.
              </p>
              {hasMetaMask && (
                <div className="flex flex-wrap gap-2">
                  {mode !== "metamask" && <Button size="sm" onClick={() => setMode("metamask")}>Use MetaMask</Button>}
                  <Button size="sm" onClick={switchToGanache}>Add Farmy network</Button>
                </div>
              )}
            </Card>
          </div>
        </li>
      </ol>
    </Section>
  );
}

function People() {
  const { people } = usePeople();
  return (
    <Section id="people" title="Meet the people">
      <p className="text-ink-soft">Each Ganache account plays one part. You can rename them on the <Link href="/people" className="font-semibold text-sky underline">People</Link> page.</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {people.slice(0, 7).map((p) => (
          <li key={p.address} className="rounded-xl border border-line bg-card p-3">
            <p className="font-semibold">{p.emoji} {p.name}</p>
            <p className="text-sm text-ink-soft">{ROLE_JOBS[p.role]}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Story() {
  const { people } = usePeople();
  const { mode, actAs } = useWallet();
  return (
    <Section id="story" title="The story">
      <p className="text-ink-soft">Play it in this order. The banner at the top of each page also tells you what&apos;s next.</p>
      <ol className="space-y-3">
        {STORY.map((s, i) => {
          const person = people.find((p) => p.role === s.role);
          return (
            <li key={i} className="flex gap-4 rounded-xl border border-line bg-card p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-field font-display font-bold text-field-ink">{i}</span>
              <div className="space-y-2">
                <p>
                  <b>{person ? `${person.emoji} ${person.name}` : s.role}:</b> {s.text}
                </p>
                <div className="flex flex-wrap gap-2">
                  {mode === "demo" && person && <Button size="sm" onClick={() => actAs(person.address)}>Act as {person.name}</Button>}
                  <Link href={s.where.href} className="inline-flex h-9 items-center rounded-xl border border-line px-3 text-sm font-semibold hover:bg-field-wash">
                    Go to {s.where.label}
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

function Rules() {
  const [last, setLast] = useState("100");
  const [markup, setMarkup] = useState("20");
  const lastNum = Number(last);
  const markupNum = Number(markup);
  const cap = Number.isFinite(lastNum) && Number.isFinite(markupNum) ? (lastNum * (100 + markupNum)) / 100 : null;

  return (
    <Section id="rules" title="The rules">
      <Card className="space-y-3">
        <p className="font-semibold">Price cap</p>
        <p className="text-sm text-ink-soft">A sale can cost at most the batch&apos;s last price plus the max markup. Each completed sale becomes the new last price, so prices can&apos;t climb freely along the chain.</p>
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <Field label="Last price (FRM)">
            <input className="input tabular" inputMode="decimal" value={last} onChange={(e) => setLast(e.target.value)} />
          </Field>
          <Field label="Max markup (%)">
            <input className="input tabular" inputMode="numeric" value={markup} onChange={(e) => setMarkup(e.target.value)} />
          </Field>
        </div>
        <p className="font-display text-2xl font-bold">Cap: {cap === null ? "…" : `${Math.floor(cap * 1e6) / 1e6} FRM`}</p>
      </Card>
      <Card className="space-y-2">
        <p className="font-semibold">Payment and refunds</p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>The payment is released only when an inspector has validated the batch and the buyer holds the goods.</li>
          <li>The seller can cancel a sale and refund the buyer at any time before release.</li>
          <li>The buyer can take the money back only while those two conditions aren&apos;t both met. Sellers should hand goods over after validation.</li>
        </ul>
      </Card>
    </Section>
  );
}

function Errors() {
  return (
    <Section id="errors" title="What errors mean">
      <p className="text-ink-soft">When the contracts refuse something, Farmy shows one of these sentences under the button.</p>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-soft">
            <tr>
              <th className="p-3 font-semibold">Contract error</th>
              <th className="p-3 font-semibold">What you see</th>
            </tr>
          </thead>
          <tbody>
            {ERROR_HELP.map((e) => (
              <tr key={e.name} className="border-t border-line">
                <td className="p-3 font-mono text-xs">{e.name}</td>
                <td className="p-3">{e.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

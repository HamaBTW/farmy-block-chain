# Farmy design system

The look and the rules for every screen in `farmy_web`. Shared file: change it with a Decisions Log entry and tell your partner.
Tokens live in `src/app/globals.css`; components in `src/components/ui/`.

## 1. Idea
Farmy is a **farm market**, not a crypto app. Goods arrive in crates with kraft-paper tags, get stamped at each check, and sell at a fair price.
- **The memorable thing:** the **batch tag**, a kraft-paper produce tag with a punched hole, and its **stamps** (the journey). Spend boldness only there.
- **Everything else is quiet:** paper background, plain cards, one green action per screen.
- **Plain words:** say what happens, in the user's words. "Hand over to Buyer", not "transferCustody".

## 2. Color tokens
Use the CSS variables (or the Tailwind names mapped from them), never raw hex in components.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--paper` | `#F1F3EA` meadow paper | `#121A14` | page background |
| `--card` | `#FFFFFF` | `#1A241D` | cards, panels, inputs |
| `--ink` | `#1C2A20` | `#E7EDE3` | text |
| `--ink-soft` | `#4F5E53` | `#A9B5AB` | secondary text (≥ 4.5:1 on paper and card) |
| `--line` | `#D9DECF` | `#2C3A30` | borders, dividers |
| `--field` | `#2E5E3A` field green | `#7CC48A` | primary action, success, "validated" |
| `--field-ink` | `#FFFFFF` | `#0E1A11` | text on `--field` |
| `--harvest` | `#C98A12` harvest amber | `#E6B54A` | waiting, for sale, warnings (fills, dots, borders only) |
| `--harvest-ink` | `#7A5000` | `#F0C66A` | amber **text** (the fill is too light for text on white) |
| `--beet` | `#A23B4B` beet red | `#E3828F` | danger: cancel, refund, errors |
| `--sky` | `#2F6F96` | `#7DB5D8` | info, links, hints |
| `--kraft` | `#E8D6B0` | `#3A3022` | batch tag paper |
| `--kraft-ink` | `#4A3720` | `#EBDDBF` | text on the tag |

Each status color also has a `-wash` token (the color at ~12% on card) for chip and banner backgrounds.

**Status mapping, used everywhere:**
| Meaning | Color | Example |
|---------|-------|---------|
| Done / validated / released | field | "Validated", "Payment released" |
| Waiting / listed / paid into escrow | harvest | "For sale", "Waiting for inspector" |
| Cancelled / refunded / error | beet | "Refunded", revert messages |
| Info / hint | sky | Next step banner, guide tips |

## 3. Type
| Role | Family | Size / weight | Notes |
|------|--------|---------------|-------|
| Display (page titles, tag product name) | Bricolage Grotesque | 2rem / 700, tracking -0.01em | market-sign feel |
| Price on the tag | Bricolage Grotesque | 2.5rem / 800, tabular figures | the one big number |
| Section heading | Bricolage Grotesque | 1.25rem / 700 | |
| Body | Figtree | 1rem / 400, line-height 1.55 | |
| Small / meta | Figtree | 0.875rem / 500 | |
| Address, hash | Geist Mono | 0.8125rem / 400 | only for machine values |

Rules:
- Sentence case everywhere. No ALL-CAPS labels, no eyebrow labels above headings.
- Amounts use Figtree/Bricolage with `font-variant-numeric: tabular-nums`, not mono.
- Lines of text stay under ~70 characters (`max-w-prose`).
- No single highlighted word inside a heading.

## 4. Space, shape, depth
- Spacing scale (Tailwind): 1, 2, 3, 4, 6, 8, 12. Cards use padding 5 (1.25rem), stacks use gap 4.
- Radius by hierarchy, not one radius for all:
  - page panels / cards: `1rem`
  - buttons, inputs: `0.75rem`
  - chips, person buttons: full pill
  - batch tag: `0.5rem` with a cut top-left corner and a punched hole (see §6)
- Depth: cards have a 1px `--line` border and no shadow. Only the batch tag has a shadow (`0 1px 0 var(--line), 0 8px 20px -12px rgb(0 0 0 / 0.35)`), because it's a physical object.
- Layout: max width 72rem, content left-aligned, 16px side gutter on mobile. Desktop journey uses a 5/7 column split; everything stacks below 768px.

## 5. Motion
- One deliberate moment: a new **stamp** lands on the timeline after your own transaction (scale 1.15 → 1, rotate -6° → -2°, 220 ms).
- Responses to actions: button spinner while pending, toast slides in from the bottom.
- No entrance animations on page load, no hover lifts on cards.
- `prefers-reduced-motion: reduce` turns all of it into instant changes.

## 6. Components
| Component | What it is | Rules |
|-----------|-----------|-------|
| `Button` | variants `primary` (field), `secondary` (card + line), `danger` (beet), `ghost` | One primary per panel. Label = verb + object ("List for sale"). No trailing arrows |
| `TxButton` | `Button` that runs a transaction | Pending label "Confirm in MetaMask…" (MetaMask) or "Sending…" (demo). Success toast in past tense of the label ("Listed for sale"). Errors as a sentence from `lib/errors.ts` under the button |
| `Card` | plain panel | `--card`, `--line` border, radius 1rem |
| `Chip` | small status pill | color from the status mapping, `-wash` background, text in the status color (`--harvest-ink` for amber) |
| `PersonName` | an address shown as a person | emoji + name, then short address in mono and a copy button. Unknown address = short address only |
| `PersonPicker` | choose an address | a wrap of pill buttons, one per person, selected = field; last pill "Other address…" opens a text input with validation |
| `AmountInput` | FRM amount | number input + "FRM" suffix + quick chips (e.g. At cap, Same price, +10%), helper line shows the cap |
| `Tag` | the batch tag | kraft paper, punched hole top-left, product emoji + name, origin and quantity, big price, "held by" `PersonName`, status chips |
| `Stamp` | one timeline event | round ink stamp in the event's status color with an icon, title, who, when (block), and details |
| `NextStepBanner` | top-of-page hint | sky wash, one sentence + one action (or "Switch to X" in demo mode). Hidden when nothing is waiting |
| `Toast` | confirmation | bottom center, auto-hide 4 s, field for success, beet for errors |

Focus: every interactive element shows a 2px `--sky` outline with 2px offset on `:focus-visible`.
Touch targets: at least 40px high.

## 7. Icons and emoji
Emoji are the icon set, and each one means one thing:
- People: 🏛️ Regulator · 🔍 Inspector · 🧑‍🌾 Farmer · 🚚 Transporter · 🏬 Warehouse · 🛒 Buyer · 🧺 Retailer · 👤 Guest
- Products: 🍅 Tomatoes · 🌾 Grain · 🐄 Cattle · 🫒 Olives · 🍊 Citrus · 📦 Other
- Events: 🌱 added · 🤝 handed over · 📋 checked · ✅ validated · 🏷️ listed · 🔒 paid into escrow · 💸 released · ↩️ refunded

## 8. Words
- Use people's words: **batch** (not token/NFT), **hand over** (not transfer custody), **pay into escrow** (not deposit), **release payment**, **refund**, **cancel listing**, **cap** (the max price).
- An action keeps its name: button "List for sale" → toast "Listed for sale" → stamp "Listed at 115 FRM".
- Errors say what happened and what to do, without apologizing: "This price is above the cap of 120 FRM. Lower it or ask the market authority to raise the markup."
- Empty states invite an action: "No batches yet. Add the first one as 🧑‍🌾 Farmer."
- Every screen footer keeps: "Simulated goods and money on a local test chain."

## 9. Checklist for a new screen
- [ ] Uses tokens only, works in light and dark
- [ ] One primary button per panel
- [ ] No raw address input without `PersonPicker`, no raw hash input without a generator
- [ ] Status colors follow §2
- [ ] Readable at 375px, keyboard focus visible, reduced motion respected
- [ ] Copy follows §8

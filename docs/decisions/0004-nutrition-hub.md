# 0004 — What a hub's own state shows, answered for Nutrition

Date: 2026-08-02

## What was removed or reversed

`docs/product-spec.md` lists under Offen: *"What a hub's own state shows, and what each hub does
beyond opening chat."* Nothing is removed here — this note proposes the answer and builds one hub
to it, so the proposal can be reviewed as a screen rather than as a paragraph. The Offen line stays
until an owner moves it, because this branch does not touch the spec.

**A hub shows the domain's evidence, not its verdict.** Four bands, in this order:

1. **Standing** — one sentence naming the pattern this domain currently sees, plus the basis it
   rests on. An observation, never a grade.
2. **Coverage** — what the hub is actually reading, facet by facet, and how fresh each one is.
3. **Contribute** — the domain's own way in. For Nutrition, the meal photo.
4. **Take to the table** — named questions that open chat already pointed at something.

Nutrition's four facets are Legacy's own nutrition domain set, taken from
`apps/mobile/src/data/coach/coachDomains.ts`: `nutrition`, `biomarkers`, `micronutrients`,
`hydration`. Reused rather than re-invented, because that set is what the coach side already reasons
about, and a hub that groups the domain differently from the assistant would be two products.

## Why the previous answer stopped being right

The question was open because the two obvious answers were both already rejected. Verworfen names
them: a hub overview that is a score page, and a hub whose front door is an empty chat. What was
missing was a third thing for the screen to be.

**Coverage is that third thing, and it is what replaces the score.** A score is tempting because it
answers "how am I doing here?" in one glance. Coverage answers a different question — "how much does
this domain actually know about me?" — and it is the one the product can answer honestly.

The argument that settles it is a failure mode Legacy hit and had to patch. `nutritionHomeBlock.ts`
carries a constant called `MIN_DAYS_FOR_A_WEEKLY_CLAIM`, added because the weekly score unlocked at
three logged meals and three meals fit inside one day, so the app said "fiber has been light this
week" off a single lunch. A score has to invent a floor under which it lies. Coverage has no such
floor: with nothing logged it says nothing is logged, and that is a true and useful screen. Thin
data makes a score wrong; it only makes coverage short.

**Chat stays one step further in, and now that is literal.** The threads band is the only route to
chat from a hub, and every thread carries a subject. There is no empty box anywhere on the screen.
The threads reuse the existing `/table?domains=<id>` route rather than adding a hub-local chat, so
a hub asks in exactly the same place the Open Table does — one chat surface, reached two ways.

**Contribute is what stops this being a dashboard.** Nutrition is the hub where the user puts
something in, so the meal photo sits above the fold as the one saturated accent on the screen. A hub
with nothing to contribute would simply not render that band.

## What this costs

- **An empty hub is a nearly empty screen.** Nutrition with nothing connected is a title, one line
  saying nothing is logged, and two ways to start. That is accepted, and it is the honest shape: a
  hub that pads itself when it knows nothing is the score page under another name.
- **Four bands is a guess that fits Nutrition.** Labs may want the facet list to be the whole screen,
  and Mind may have no contribute band at all. The order is the durable part; the count is not.
- **Coverage still has a wrong-freshness failure.** "From your last lab report, 12 Mar" reads as
  current until the reader checks the date, which is the same trap the drift number's caption was
  written to defuse on Home. Both now depend on a date being read. If that turns out to be too much
  to ask of a glance, it fails in two places at once.
- **This branch sits on top of `claude/legacy-design-system`, not on `main`.** It is the first real
  consumer of those tokens and of the `ThemeProvider` that branch adds to `src/app/_layout.tsx`, so
  it cannot be reviewed or merged before it. The ordering is real, not a convenience: design system
  first, then this. Colours come from `useTheme()`, everything else from the token exports, and
  nothing here holds a second copy of either.

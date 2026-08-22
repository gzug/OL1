# 0016 — A test nobody can run

**Status:** accepted, 2026-08-22
**Removes the last invented content in the app. Records a product idea so it survives the pixels.**

## What went

Six fixtures on the Digital Twin, all of them below the sample-data line, and the line itself.

| Gone | Why |
| --- | --- |
| A sample person's name | There is no name field, deliberately. Legacy's first word to its user was `G.` — an initial invented from a name nobody gave. |
| `12 lab reports · connected since Jan · 3 tests done` | Only the panel count was derivable. Nothing is connected, and tests do not exist. |
| A running test, day 6 of 14 | See below. |
| Two completed tests with results | See below. |
| Two insight sentences | The identical pair came off Home on 2026-08-21 for the same reason. Nothing computes them and nothing can. |
| `Today · the evening walk` | It survived only as the pill pinned under the running test. |

With the last of them gone there is nothing on the Twin to mark, so `SAMPLE_DATA_LINE` came off this
screen too. **A marker with nothing under it is itself a claim** — it tells a reader that something
below is invented, on a screen where nothing is.

## The idea worth keeping, which is the point of this note

The owner's condition for removing the tests was that the idea be written down. It is a good one and
nothing else in the product does it.

**A test is a change you make on purpose, for a fixed number of days, to find out whether it does
anything.** Evening light for two weeks. Dinner an hour earlier. It has:

- **a start, a length and an end** — the length is chosen up front, which is what separates a test
  from a habit and what stops it being judged on its first bad day;
- **a daily ask** — one thing to do today, which is why the running test and Home's daily focus were
  never allowed to compete for the same slot;
- **an outcome that may be nothing.** *No clear difference* was one of the two fixture results, and
  it is the honest majority case. A feature that can only conclude "it worked" is a horoscope.

**Why it could not stay on screen.** There was no way to start one, no way to tick a day, no way to
finish one, and nowhere to keep any of it. What rendered was a shape — six of fourteen cells filled —
and the shape is the least interesting part of the idea.

**What building it actually needs**, so the next person does not rediscover it: somewhere to store a
test, its length and its days; a way to start and to stop; and a decision about what an outcome is
allowed to say, which is the hard part. *Kept it, felt easier* is a person's own verdict and is safe.
Anything the app concludes on its own is a causal claim from n=1, which is exactly what the fixtures
rule and `0013` exist to prevent.

## What else this exposed

`src/ui/mockup/fixtures.ts` is deleted. Removing the invented exports left one behind — the three
rows reading *Not connected yet* — and that one is **true**. A file whose header says *invented for
layout review, never values* holding nothing but the app's real state is the same defect one level
up, so it moved to `src/ui/twin/sources.ts` with a note that it is a hard-coded truth: correct today,
and a lie the day anything connects, without anybody editing it.

## And one defect found while reading

`AboutYou` held a single `null` for three different things — nobody has looked yet, the read failed,
and there is no profile — and printed *"Add your year of birth to get a biological age"* for all
three. So a store that would not open asked somebody for a year they had already given.

Shape 1 of `0013`, and the most repeated defect in this codebase. The judgement moved to
`src/ui/twin/aboutYou.ts`, where bare Node can hold it, with the three states named.

## What this costs

- **The Twin is short now**, and nearly empty for somebody who has just installed the app: a grey
  body, an invitation to give a birth year, three rows saying nothing is connected, and no ledger.
  That is the honest state of the product and it is deliberately not filled in this change — the
  owner asked for the clean-up first and the design of what belongs there second, so that the options
  are drawn against a true screen rather than a half-invented one.
- **The idea of a test now exists only here.** That is the trade this note is.

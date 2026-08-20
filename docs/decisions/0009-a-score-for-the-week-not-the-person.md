# 0009 — A score for the week, not for the person

**Status:** accepted, 2026-08-20
**Supersedes nothing. Bounds `0004` and `0005`.**

## The tension

`0004` proved that a score needs a floor under which it lies, and `0005` recorded the correction
that came out of it: **grading the data was rejected, showing it was not.** Every number on a hub
since then has been a reading — how many, how long, how recently — and never a mark out of a hundred.

Then the owner reviewed Legacy on 2026-08-19 and said yes to *"a week scored, with its confidence
stated"* — Legacy's `nutritionScore.ts`. That is a mark out of a hundred.

## Why it is allowed here

**It scores the week's LOGGING against published reference points, not the person against a norm.**
The distinction is not a word game and it survives the tests:

- The inputs are what was written down. A week eaten perfectly and recorded twice scores badly, and
  the confidence label says exactly why. A score that rose when someone ate better would be a
  judgement about them; this one rises when they record more, which is a judgement about the record.
- The targets are Legacy's stated reference points — protein at 18% of energy, fibre at 14g per
  1000 kcal — not a personal baseline and not a diagnosis. Nothing here says whether a person is
  healthy, and nothing here may start to.
- **It refuses to speak below three meals**, and pairs with `weekly.ts`'s ported rule that a
  sentence containing "this week" needs four logged days under it.

`0004`'s actual requirement is met rather than dodged: a score needs a floor under which it lies,
and this one has two — the minimum meals, and a confidence label that is on screen beside it every
time, never hidden behind a tap.

## What we refused at the same time

The owner also said yes to Legacy's **single 0–100 recovery number**
(`data/persona/todayRecoveryScore.ts`) in the same pass, and reversed it when the difference was put
to him. That one scores the PERSON — how recovered you are today — and it is exactly what `0004`
rejected. It is recorded as refused in `docs/legacy-inventory.md` §5.

The line between the two is the whole of this decision. A score of a record is a reading. A score of
a body is a verdict.

## The consequence to watch

A sub-score can be absent, and the weights renormalise over what is there — a missing part is never
a zero. Today `wholeFood` is always absent, because our meal flow records macros and a note rather
than a list of items with a processing level, so the score is made of protein and fibre and the
screen says so. **If that sentence ever stops being shown, the score starts overstating itself.**

# 0012 — CRP is read at the floor the model was fitted to

**Status:** accepted, 2026-08-20
**Extends `0003`** (the panel and its refusals). **Changes a number the owner can see.**

## What happened

The owner asked, on the day the Digital Twin first showed a real biological age, whether the
calculation was right. He had his own answer: a commercial app he pays for, holding the same blood
panel, said **27.9**. OL1 said **26.4**.

A 1.5-year gap on the headline number of the app is not a rounding difference, and "ours is
probably fine" is not an answer. So it was diagnosed rather than dismissed.

**The chronological age was identical.** The other app displays a reference range of 32.98 years,
which is exactly the owner's age at the draw date to four significant figures — so both were
computing from the same age, and the difference was in a marker.

**Eight of the nine markers could not be it.** Solving each one individually for the value that
would produce 27.9 gave nothing the report supported. CRP was the exception, and CRP was also the
one marker where the report printed two different numbers: a high-sensitivity result, and an
ordinary one reported only as *below the assay limit*.

The first conclusion was that the other app was wrong — that it had read a censored `<3` as the
number three, which is exactly the failure `parseReport` had a guard written against that same day.
That conclusion was put to the owner with a recommendation to keep 26.4.

**It was wrong, and the owner's instruction is what found it.** He answered: *"It always has to be
the most scientific possible."* Checking rather than assuming turned the argument over completely.

## Why the floor is right

NHANES III measured CRP by latex-enhanced nephelometry. Below roughly **0.21 mg/dL — 2.1 mg/L —
the assay could not detect it at all**, and those participants were recorded at the limit. Levine
2018 was fitted on that data. So the coefficient `0.0954 × ln(CRP)` was estimated from a sample in
which **CRP never went below 2.1 mg/L**.

A modern hs-CRP assay reads an order of magnitude finer. Feeding `0.6 mg/L` into that term is not
using the model precisely — it is extrapolating it three and a half times below the smallest value
it ever saw.

And `ln` has no floor. Holding a real panel steady and moving CRP alone:

| hs-CRP (mg/L) | PhenoAge |
| --- | --- |
| 3.0 | 28.0 |
| 2.1 — the fitted floor | 27.7 |
| 0.6 | 26.4 |
| 0.2 | 25.2 |
| 0.05 | 23.8 |
| 0.005 | 21.4 |

The number falls without limit toward a CRP of zero. Everything under 2.1 is the model describing a
person it was never shown. **The clamp is not a safety rail bolted onto the maths; it is the edge of
the maths.**

## What this costs

The owner's biological age moves from 26.4 to 27.7 — **less flattering, and correct**. Any future
result with a genuinely low hs-CRP will read higher than an unclamped calculation would give.

The honest loss is real and worth stating: a person with excellent inflammatory markers is
biologically different from one sitting at an old assay's detection limit, and this model cannot
express that difference. That is a limitation of PhenoAge, not something this repository can fix by
choosing a smaller number. What it can do is not pretend otherwise.

CRP also stops appearing as a driver for anyone below the floor, because both their value and the
reference are compared at the floor and cancel. That is the same honesty in a second place: where
the model cannot tell two people apart, it must not claim one of them is being moved by their CRP.

## The one number here that is uncertain

Published detection limits for NHANES III CRP vary between **0.21 and 0.30 mg/dL** depending on the
source. That range moves a result by about four tenths of a year — 27.7 at the low end, 28.0 at the
high. `0.21` is used: it is the most frequently cited, and where sources disagree the smaller clamp
discards least of a real measurement.

This is recorded rather than smoothed over. It is the difference between a value that was chosen and
one that merely appeared.

## The rule this establishes

**A model may only be evaluated inside the data it was fitted on.** Where an input can leave that
range, the boundary is a named constant with its provenance attached, not a magic number inside an
expression — `CRP_FLOOR_MGL` in `src/application/labs/phenoAge.ts`.

And the reason this was caught at all: **a real result, checked against an independent
implementation, by someone who already knew the answer.** No test in this repository would have
found it. Every fixture here is invented, and an invented panel has whatever CRP its author chose —
which was never low enough to matter.

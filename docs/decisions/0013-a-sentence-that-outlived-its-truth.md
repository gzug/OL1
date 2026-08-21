# 0013 — A sentence that outlived its truth

**Status:** accepted, 2026-08-21
**Applies to every screen. Establishes four guards.**

## The class

A string rendered to a person that asserts something about their data, the app's state, or what the
app can do — where the assertion is false, or was true when it was written and quietly stopped being
true as the code around it changed.

None of these are crashes. None fail a type check, a lint rule or a test. **CI cannot see them at
all**, which is why they accumulate silently and are found by eye, one at a time, usually by the
owner.

Four were found by hand on 2026-08-20:

- The Digital Twin rendered a hard-coded `41.6` as a biological age. The real calculator had existed
  for seventeen days and had never been connected to anything.
- Directly beneath it, a row read *"Blood work · 9 of 9 markers, from the panel drawn 12 Mar"* on a
  screen that, two centimetres above, said no panel had ever been added.
- The banner on every screen read *"Mockup · nothing here works"* long after logging, the body
  figure and the biological age all worked.
- A line read *"Yours. Everything below this is sample data"* — above four blocks of the person's
  own blood results.

## What the sweep found

A multi-agent audit on 2026-08-21 swept the whole UI surface for this one class: six readers by
area, each finding adversarially refuted by a second agent whose default was that the finding was
wrong. **Thirty-two survived refutation.**

The worst is fixed in the same commit range as this note and is worth stating, because it is what
this class looks like when it stops being cosmetic:

The lab form's idea of *today* was the string `2026-08-03`, typed into the source. It was true for
one day. Eighteen days later every genuine draw date from the 4th onward was rejected as being in
the future, the Approve button went dead with nothing on screen explaining why, and the only way
forward was to clear the date — which caused the panel to be stamped with the moment the button was
pressed. **Panels sort by that date**, and three screens read whichever is newest, so a panel from
March entered that afternoon became "your latest results" and the biological age was computed
against it. The comment directly above the offending line stated the rule it was breaking.

## Why it keeps happening

OL1 is a half-built app whose screens were made to look finished with placeholder text and silent
defaults. Every placeholder is a true-sounding sentence sitting next to a feature that is about to
arrive — and **when the feature arrives beside it, the sentence becomes a lie without anyone editing
it.** The diff that breaks the sentence never touches the sentence.

That is why it is a class and not a series of mistakes, and why discipline is not a fix for it.

## Four shapes, and the guard for each

1. **Claiming absence without a successful read.** *"Nothing recorded"*, *"nothing logged"*,
   *"nothing added yet"* — printed from a value that also means the read failed, or has not happened
   yet. A store that will not open must never produce a claim about a person's data.
   → **Guard:** every screen mounted against two fixtures, an empty store and a broken one, asserting
   that the broken one renders no sentence about the person. The cheapest and highest-value of the
   four.

2. **A default silently replacing a fact.** A blank draw date becomes *now*, and once stored it is
   indistinguishable from something somebody said.
   → **Guard:** when a value is substituted, store that it was — *given* against *assumed* — and let
   no sentence naming a date be written without reading that flag.

3. **Intent recorded as a completed act.** Pressing *Take a photo* stores `photographed`. A button
   press is a plan; the past tense claims a performance.
   → **Guard:** provenance values like `camera` and `photo` may only be assigned by code that
   actually captures an image.

4. **Frozen constants and drifting boundaries.** Today's date typed into source; a *sample data
   below here* marker left in place while real features grew above it.
   → **Guard:** `scripts/check-frozen-dates.mjs`, shipped with this note, fails the build on any
   hard-coded calendar date in `src/`. It was fed a known violation and watched go red before being
   believed.

## The rule

**A sentence about a person's data is a claim, and a claim needs a source.** Where the source does
not exist yet, the sentence does not get written — not as a placeholder, not as sample content on a
screen that also shows real output.

Home lost two lines to this on the day this note was written. It is the ring and the chat bar until
something real belongs between them, and that is the correct shape for a screen with nothing true to
say yet.

## What this note does not claim

That the four guards catch everything. They catch four shapes; the sweep found the shapes by reading,
and reading is still what finds a fifth. The guards exist so the same four never have to be found by
a person twice.

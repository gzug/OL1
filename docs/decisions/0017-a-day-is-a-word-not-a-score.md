# 0017 — A day is a word, not a score

**Status:** accepted, 2026-08-22

## What was built

Resilience had two buttons that did nothing. One of them, "Add how the day felt", now leads to
`/log-day`: five words, one tap, an optional note. It is the half of that hub that needs no device.

**What is stored is the word.** Not a number, not a rating, not a position on a scale.

## Why not one to five

On **2026-08-19** the owner reviewed all 91 of Legacy's capabilities and dropped four outright. One
of them was Legacy's **0–100 recovery score** (`todayRecoveryScore.ts`).

Storing a 1-to-5 here would put that number back through a side door, and the path is short and
entirely natural at every step:

1. Five integers **average**.
2. An average over seven days **wants a trend**.
3. A trend **wants a dial**, or a colour, or an arrow.
4. And now the app is telling somebody their week was a 3.4.

Nobody would have to decide to build a recovery score. It would arrive as four reasonable
refactors, each one obviously an improvement on the last.

`0009` allows **exactly one score in this app**, and says what it is: how much you logged and what
was in it, never how you are doing. A second number about how a week felt is the thing `0004` and
`0005` refused when they rejected grading.

## What this makes impossible

The stored value has no arithmetic available to it. `resiliencePeriods` can count how many times a
word was chosen — that is arithmetic on **days** — and it cannot compute a mean, because there is
nothing to take the mean of. The refusal is enforced by the data shape rather than by discipline.

A tie has no answer and the screen says so, in words: **"No one word · no answer came up more than
the rest."** Picking a winner alphabetically, or by whichever the sort happened to leave first,
would be inventing the reading.

## The words

`Drained · Tired · Steady · Fresh · Strong`

They are listed the way a person would list them and the app never reads that order as a rank.
Changing them later is one edit to `DAY_WORDS`; a stored word that is no longer offered simply stops
being reportable, which is the correct behaviour — `dayOf` returns null for a word this app does not
have, rather than showing a label it cannot stand behind.

## What has to stay true

Anything built on top of this — a coach brief, a weekly letter, a morning message — may say **which
words came up and how often.** It may not:

- convert a word to a number, anywhere, for any purpose
- rank two days against each other
- draw a line, a bar height, or a colour intensity from the order of `DAY_WORDS`
- describe a run of words as "improving", "declining" or "a good week"

If a future feature needs a number about recovery, it needs a **measurement** — heart-rate
variability from a watch, which this hub is already waiting for. Not a rating dressed as one.

Same shape as `0018`: compute what is arithmetic, refuse what is a proxy.

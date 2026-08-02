# 0003 — A persistent chat bar on Home

Date: 2026-08-02

## What was removed or reversed

`docs/product-spec.md` settled on 2026-07-31 that chat is reached, never presented:

- "Tapping a hub opens that hub's own state. Chat is one step further in, never the front door."
- Under *Verworfen*: "ein Hub, dessen Eingang ein leerer Chat ist."

Home now carries a chat input pinned to the bottom, visible at all times, alongside the Open
Table. The spec sentences above are updated in the same change rather than left contradicting the
screen. `HomeMockup.tsx` carried the first sentence as a code comment; that comment goes too.

What is **not** reversed: a hub's own front door. `/hub/[id]` still opens that hub's state, not a
chat. The rejected shape was a hub whose entrance is an empty chat box, and that stays rejected.

## Why the previous answer stopped being right

The rule was written to stop chat from becoming the product — a coach app where every screen is a
text box and the health data is decoration. That risk is real and the rule addressed it correctly.

It also assumed every question arrives already sorted into a domain. Owner decision, 2026-08-02:
most do not. "Why am I so tired today" is not a Sleep question until something answers it, and
routing it through hub selection asks the user to diagnose before they may ask. The Open Table
answers a different question — *I know which domains matter and want them together* — and it
keeps that job. The bar is for the question that has not been classified yet.

The distinction that survives: Home shows **state**, and the bar is an **action**, in the thumb
zone, beside the Open Table. It is an input, not a transcript. Home does not become a chat log.

## What this costs

- **The centre now competes with something permanent.** Three information rows and two actions.
  The one-element-per-visual-channel rule gets harder to hold, and this is the screen most likely
  to need a second look once it is on a real device.
- **A visible input invites use before there is much to answer with.** Context is fixtures only,
  so early answers will be thin. Guessed and expected to tune: whether the bar shows a prompt
  ("Ask anything") or stays blank until tapped.
- **The Open Table's job gets less obvious.** Two ways to start a conversation sit within a
  thumb's reach of each other. If usage shows one of them never gets touched, that is the signal
  to remove one — not to add a third.
- **Chat is no longer one step further in, so it is no longer cheap to change.** Anything Home
  shows is seen by everyone every time.

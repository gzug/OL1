# 0002 — Product structure is no longer undefined

Date: 2026-07-31

## What was removed or reversed

`docs/product-spec.md` stated under Bestätigt: *"Product, screen, and navigation structure remain
undefined."* That line is gone. Two screens, the center stack, hub behaviour, and where tests live
are now settled and written down.

## Why the previous answer stopped being right

The line was true at bootstrap and stopped being true on 2026-07-31, when the owners settled the
structure in order to start a visual build of both screens. Leaving it in would have told the next
agent that the structure was open while a build was already assuming it.

Two decisions inside it are worth naming because they were argued and could reasonably have gone
the other way:

- **A hub's front door is that hub's state, not chat.** A chat window has nothing visible on open;
  it asks the user to produce the value. An overview page would have been a score page, which is
  the thing this product is not.
- **Running tests live in the Digital Twin, not on Home.** A 14-day test shows nothing for 13 of
  those days. What is alive daily is the user's part in it, and that is the Daily Focus — so the
  Daily Focus now either carries the running test's ask or steps aside for the next candidate.
  Without that rule the two would compete and the test would become something happening to the
  user in the background.

## What this costs

The Open Table keeps a provisional name; anything that counts participants breaks when the
selection is one or six. Whether hub selection weights the answer or restricts what the coach may
use is deliberately left open in Offen — it decides whether a wrong selection can silently blind
the coach, and it is not a naming detail.

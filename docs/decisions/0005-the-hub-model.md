# 0005 — What a hub is: two doors, a cockpit, and a hub the user can make

Date: 2026-08-03

Numbered 0005 rather than 0003 because `0003-persistent-chat-bar.md` and `0004-nutrition-hub.md`
already exist on unmerged branches. Reusing a free number on `main` would have produced two
different 0003s.

## What was removed or reversed

Three lines of `docs/product-spec.md`, and most of the argument in `0004-nutrition-hub.md`.

1. **"Tapping a hub opens that hub's own state. Chat is one step further in, never the front door."**
   A hub now opens **two doors**: its coach, and its cockpit. Chat is one of the two things a hub is
   for, not a place kept deliberately out of reach.
2. **"The Open Table opens from the center."** The centre is the Digital Twin now. The Open Table is
   built in the chat bar at the bottom of Home, by selecting coaches inside the bar itself.
3. **"A hub shows the domain's evidence, not its verdict"** — `0004`'s answer, which put a
   *coverage* band where a score would go and deliberately showed no data over time. The cockpit
   shows the domain's data across yesterday, the week and further back, which is the thing `0004`
   argued a hub should not do.

Also reversed in effect: the six hubs were a fixed union type in code. They are data now, because
the user can create hubs from Home and exercise types from inside Activity.

## Why the previous answer stopped being right

`0004` was written to answer a question the spec had left open — *what does a hub's own state show?*
— at a time when two answers were already rejected: a score page, and an empty chat box. Coverage
was proposed as the third thing, and the argument for it was good: a score needs a floor under which
it lies, Legacy needed `MIN_DAYS_FOR_A_WEEKLY_CLAIM` because its weekly score claimed a week off a
single lunch, and coverage has no such floor. Thin data makes a score wrong; it only makes coverage
short.

**That argument is still correct, and it answered the wrong question.** It treated "not a score" and
"not an empty chat" as the only constraints, and concluded that a hub should therefore avoid showing
the domain's numbers at all. The owner, asked directly, wants exactly those numbers: *"for Sleep you
would see your sleep data from the previous day, week and so on"*.

The mistake was inferring a product decision from a safety property. Coverage is safe because it
degrades honestly, but "shows data over time" was never the thing being rejected — **grading** it
was. A cockpit that shows sleep across a week and draws no verdict is not a score page. `0004` ruled
out a category the owner had never ruled out.

What survives from `0004`: coverage is still the right way to render a facet nothing is connected
to, and a hub that knows nothing must still say so rather than pad itself. Those become part of a
cockpit rather than a replacement for one.

The second reversal has a simpler cause. "Chat is one step further in" was a rule about *hierarchy*
— chat should not be the whole product. A permanent bar under the orbit does not make it the whole
product; the orbit is still what the screen is. The owner overrode the rule and the reasoning holds:
a bar carrying a coach selection is not an empty box, which is what the rule was actually protecting
against.

## What this costs

- **PR #6 is superseded and has to be reworked, not merged.** It builds `0004`'s screen and ships
  `0004`'s argument. The header fix, the contrast work and the Standing and Coverage bands are worth
  keeping; the claim that a hub shows no data over time is not.
- **A cockpit can be wrong in a way coverage could not.** Showing a week of sleep invites the reader
  to draw a conclusion from it, and the app is not making one. `0004`'s warning about a stale date
  reading as current applies with more force here, not less.
- **Giving up the fixed hub union loses compile-time safety.** A hub can now point at a coach that
  does not exist, and `find` can return undefined where it could not before. `tests/hub-catalog.ts`
  replaces that guarantee with assertions; a test is a weaker promise than a type.
- **"The orbit grows and shrinks" has no upper bound yet.** Even spacing alone is not enough — at
  eight evenly spaced hubs one lands at exactly 90°, on top of the centre stack, and the circles
  begin touching around fourteen. The count at which the ring stops being the right shape is a
  guess nobody has made yet, and it is listed as open rather than answered here.
- **Four bands were a guess that fitted Nutrition, and the cockpit inherits that risk.** Labs may
  want its facet list to be the whole screen; Mind has nothing to port and no data source at all.
  Mind is deliberately the last hub to design, so the framework has bent three times before it has
  to survive the hardest case.

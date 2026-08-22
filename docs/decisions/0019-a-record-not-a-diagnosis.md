# 0019 — A record, not a diagnosis

**Status:** accepted, 2026-08-22

## What was built

Health record was the last hub with no way in. `/log-condition` and `/log-medication` now exist, and
the cockpit lists what was typed.

## The four things it refuses

**No vocabulary and no autocomplete.** Offering a list of conditions to pick from would make the app
the thing that decides what somebody has. A free-text name is theirs; a picked one is ours, and the
difference matters more here than anywhere else in the product.

**No dose checking.** A number is not validated against anything, because there is nothing honest to
validate it against — this app does not know a person's weight-adjusted dosing, their kidney
function on the day, or what their doctor actually said. A field that rejected "too much" would be
claiming all three.

**No interaction checking, ever.** Two medications recorded here are two strings. This is the
refusal most worth writing down, because it is the one a person is most likely to assume the
opposite of: a health app holding a medication list is exactly the kind of thing that checks. It
does not, and **the screen says so in both places** — once in the flow and once on the hub, because
the flow is seen once and the hub is where somebody comes back.

**No classification.** Nothing typed is mapped to a code, a category, or a severity.

## Why it lists rather than summarises

Every other cockpit in this app summarises: counts, averages, the longest and the shortest. A week
of meals is not worth reading item by item.

A health record is nothing but its items. Three conditions and two medications **is** the whole
thing, and a block reporting "3 conditions recorded" without naming them would be a summary of
something nobody can see. So this one lists, current before past and alphabetical inside each —
**not newest first**, which is what every other block does. A record is read for what is true now,
and something recorded years ago is no less current for being old.

## A standing fact, not an event

Typing the same condition again is a **correction** — somebody adding the date they forgot, or
moving it from current to past. `answerId` makes it converge, lowercased and trimmed, so
capitalisation is not a second condition.

An event id would accumulate, and a Health record reporting one condition three times because it had
been edited twice would be worse than one reporting nothing.

## What this unblocks, and the line on it

The hub briefs already let somebody tell a coach how to work with them. A coach that can read this
hub can know what a person lives with before it says anything — which was the point of the hub.

It may **repeat** what is recorded here. It may not diagnose from it, infer severity, suggest a
change to a medication, or warn about a combination. That is the same line `0015` drew for markers
and `0017` drew for days: repeat what is there, refuse what would be a judgement.

# 0014 — A sport is a voice, not a room

**Status:** accepted, 2026-08-21
**Removes five hubs and five fixtures. Owner's decision.**

## What changed

Running, Gym, Cycling, Swimming and Golf stop being hubs. Their coaches stay.

## What they actually were

Empty rooms. **Every session ever logged goes to `exercise`** — `LogSessionFlow` writes it there,
the Strava import writes it there, and the sport is a field on the payload rather than a hub id. A
sport hub had never received a single session. The only thing in one was a note from the first run
saying it had been named.

The body figure, the heatmap and the week strip all read `exercise`. Nothing read a sport hub,
because nothing had ever written to one.

## Why they are not coming back as hubs

The owner asked directly whether Exercise should stop being a hub and each sport become one
instead, and worried the ring would overcrowd. Three answers, strongest first:

1. **Sleep and Nutrition are domains. Golf is an activity.** Putting golf on the ring beside Sleep
   says golf is as fundamental to a life as sleeping is. The ring is a claim about what a life is
   made of, and every activity added to it weakens the claim.
2. **The ring cannot take them, measurably.** `geometry.ts` stops being readable at nineteen places
   and shrinks circles to a 21-pixel minimum. Seven is comfortable. Twelve — six domains plus five
   sports — truncates the labels. The overcrowding worry was correct.
3. **Splitting destroys the only question that matters.** *Am I moving enough?* is answered by the
   heatmap, the body figure and the week strip, each of which reads one hub. Across five, every one
   of them shows a sparse and discouraging picture, and none shows the real one.

## What a sport is instead

A **lens** on Exercise, and a **voice**. Naming a sport writes an entry of kind `sport` on the
Exercise hub carrying its coach id; `sportCoachesFor` reads them back. That is what fills the *Sport
coaches* section of the conversation drawer.

`sportsLogged` sits beside it and answers a different question — what somebody has actually done,
whether or not they ticked it. Importing years of Strava history is the case it exists for: it
brings in swims from a person who never named Swimming, and offering them that coach beats waiting
to be told.

## On the name

The owner preferred **Sport** to Exercise and then kept Exercise. That was the right call: walking,
physiotherapy and carrying the shopping are movement, walking is among the highest-value things in
the longevity literature, and a hub called Sport quietly tells somebody a forty-minute walk does not
belong in it. The drawer's section is still called *Sport coaches*, because those genuinely are
sports. A broad room, specific voices.

## What this costs

Five fixture files go with the hubs — 231 lines, which is why this note exists. They described
cockpits for rooms nobody could put anything in.

Anyone who ran the first run before today has an orphaned note in `ol1.hub.entries.running` and its
siblings. The content is one sentence saying the sport was named, so nothing of value is stranded;
the entry simply stops being read. Named sports are re-recorded the next time the first run is
walked, which `/welcome` makes possible at any time.

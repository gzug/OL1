# 0008 — The centre says "Digital Twin", and every hub is tied to it

Date: 2026-08-03

## What was removed or reversed

`docs/product-spec.md` said the centre holds "BioAge/PhenoAge, Weekly Insight, and Daily Focus".
The drift number is gone from Home. The centre now carries two words — Digital Twin — and every hub
is drawn permanently connected to it.

The owner asked for it directly: *"I don't like the middle with the pheno age. I believe it should
just say digital twin and then all the bubbles should be connected with the digital twin."*

The insight and the daily focus were not removed. They moved out of the ring and sit between it and
the chat bar, which is where they were already going to have to live once the centre stopped being
a stack of three things.

## Why the previous answer stopped being right

The number in the middle made the centre a **readout**, and a readout is the one thing the centre
should not be. `0002` argued that the centre cannot carry a static element, and then filled it with
the most static element in the app — a figure that moves when bloodwork arrives, which is to say
a few times a year.

The spokes were worse. They were drawn only while choosing coaches, so the orbit stated its central
claim — one twin, fed by every domain — **only when asked a question about something else**. Drawing
them always is not decoration; it is the screen finally saying what it is for.

Nothing was lost by moving the number. `0005` put PhenoAge at the top of the Twin with its sources
named directly underneath, which is a better home for it than a ring where nothing could explain it.

## What this costs

- **Home now shows no number at all.** For anyone who opened the app to see the figure move, it is
  one tap further away. That is the trade, and it is deliberate — a number that changes a few times
  a year did not earn the middle of the home screen.
- **The centre is two words in a lot of space.** It reads as calm at seven hubs; at twelve the ring
  crowds inward and this has not been tested there.
- **The spokes are always on**, which is more ink on a screen whose whole aesthetic is restraint.
  They are drawn in `borderSubtle` rather than `border` for that reason, and they may still prove
  too loud once the ring is full.

## A layout bug found at the same time, and worth recording

The owner could not see the chat bar on the deployed site, even full screen. `MockupFrame` fixed the
web frame at the phone's 892px height with `flexShrink: 0`, so on any browser window shorter than
that the frame overflowed and the bottom of the screen — the bar — was simply not on the page. The
page does not scroll, so there was nothing to scroll to.

`maxHeight: '100%'` with shrink allowed fixes it. The comment warning against `flex: 1` there was
right about `flex: 1` and wrong to also forbid shrinking; `maxHeight` does not zero the flex basis.

**The lesson is bigger than the fix.** Every review until now happened in a tall screenshot at a
viewport we chose. The one thing that never got tested was the size the owner actually uses.

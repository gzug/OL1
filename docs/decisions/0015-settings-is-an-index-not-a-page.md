# 0015 — Settings is an index, not a page

**Status:** accepted, 2026-08-21
**Removes seven files and about 950 lines. Replaces the screen shipped in #86 and #87.**

## What changed

`/settings` was one scrolling page holding every question at once: about you, goals, training, the
hub list, a brief per coach, and a count of everything stored. It is now eleven rows in three
groups, each opening a screen of its own.

## Why the previous answer stopped being right

Three reasons, in the order they arrived.

**The owner did not like it, twice, and was specific about why.** Tick-boxes for goals were "not
thought through"; the training section was "messy" — it rendered named sports as text and unnamed
ones as buttons, two treatments for one list; the coach section was six near-identical accent-green
sentences; and "what is stored" made no sense as a section. Every one of those was correct, and four
redesigns were drawn before one landed.

**Nothing in the leading apps looks like what was built.** Whoop sets one weekly plan, Oura one
number on a slider, Levels one programme. None of them offers a wall of goals to tick, because a
checklist asks you to describe yourself rather than asking the app to do something. That research is
what settled the goals screen: it leads with the goals you hold, and adding one is a quieter act
underneath.

**A subscription layer needs somewhere to live.** This is the reason the shape had to change rather
than the styling. Plans, billing, sign-in, a contact address and notifications are five more rooms,
and a single page that already scrolled past its own footer cannot take them. An index can.

## What the index does that the page could not

- **A row can be waiting on something that does not exist**, marked, and open a screen that says
  what it is waiting for. Four of the eleven are: Email and phone, Subscription, Notifications and
  Give feedback. The owner asked for somewhere the subscription layer could live before there is one,
  and a person seeing where plans will be beats plans appearing one day where nobody expects them.
- **Nothing on the index is a control.** It holds no state and writes nothing, so the screen that
  routes cannot be the screen that gets a write wrong.

## What this note is really for

Two rules that would be easy to undo by accident.

**A row's id is a union type, not a string.** `RowId` in `rows.ts` is what makes the icon map and the
navigation switch exhaustive: adding a row without an icon, or without a destination, is a type error
rather than a blank space or a tap that does nothing. It was a `string` first, and both were silent.

**No route lives in the row data.** `typedRoutes` can only check a destination written as a literal,
so an `href: string` on the list would have made all eleven unverifiable in one move. The index maps
an id to a literal in a switch instead — more lines, every one of them checked. `FirstRunFlow`
refused the same trade for the same reason.

## What went, and where it went

| Gone | Where it is now |
| --- | --- |
| `SettingsScreen.tsx`, `parts.tsx` | `SettingsIndex.tsx`, `chrome.tsx` |
| `AboutYouSection`, `TrainingSection` | `ProfileScreen` — a sport named is a fact about you, not a setting |
| `GoalsSection` | `GoalsScreen`, leading with what you hold |
| `HubsSection` | `HubsScreen` |
| `CoachBriefsSection` | `CoachesScreen` |
| The "what is stored" count | Deleted. The owner asked what it was for and there was no answer. Where the data lives moved to Privacy, which is where people look for it. |

## What this costs

- **Eleven routes where there was one**, and each is a file. They are thin — a wrapper around a
  component — but the count is real and `tests/web-routes.test.ts` now walks a directory rather than
  a flat list.
- **A row is two taps from its value**, where the old page put everything one scroll away. That is
  the trade an index makes, and it is the right one once there are eleven of them.
- **Memory was designed and then cut.** It was in the owner's first list and he removed it himself:
  people relate to Profile, Goals, Hubs and Coaches, which are things they can point at. Memory was
  the abstraction over them. What it was for — seeing what the app knows about you — is the Coaches
  screen, and it only becomes fully true once the profile reaches the prompt, which is separate work.

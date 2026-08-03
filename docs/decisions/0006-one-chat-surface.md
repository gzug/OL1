# 0006 — One chat surface: the bar takes the bottom of Home, and a failure stops looking like an answer

Date: 2026-08-03

Numbered 0006 because `0003-persistent-chat-bar.md` and `0004-nutrition-hub.md` are still held on
unmerged branches. Same reason `0005` gave for skipping ahead.

## What was removed or reversed

**The Open Table button and its hub-selection mode are gone from the bottom of Home.** They were the
whole of `HomeMockup`'s bottom slot: a pill that opened a scrim, turned the orbit into a picker,
collapsed the centre into a disc, and confirmed with an "Ask with …" bar. The chat bar is that slot
now, and the coach chip inside it opens the same selection.

Three lines of `docs/product-spec.md` are updated in the same change, so the spec and the screen
never contradict each other.

## Why the previous answer stopped being right

The owner's answers on 2026-08-03 settled two things the spec had left open, and together they made
two selection surfaces one too many.

- **You start with no coach at all**, and add coaches into the conversation. Selection is therefore
  something you do *inside* the chat, repeatedly — not a gate you pass through once on the way in.
- **The Open Table belongs on the ring**, as an option among the hubs, because the bottom of the
  screen is the bar.

A selection step that lives on the way in cannot be the same thing as a selection you change
mid-conversation. Keeping both would have meant two lists of coaches and two pieces of state that
have to agree — and hubs are user-creatable now, so the two would have drifted the first time
somebody added one.

What survives from the old mode: the orbit still lights up while the selector is open, and tapping a
hub toggles its coach. That is the same selection shown twice, which is why `Orbit.tsx` keeps being
handed `selecting` and `selected` rather than having them go dead.

## Three decisions this change makes

**An empty selection is the general assistant, and no `general` coach was added to the catalog.**
`catalog.ts` argues in its own comments that a coach called "general" would be the only one that
cannot say what it is for. That argument still holds. The absence of a coach is a state the bar can
render; a coach that stands for absence is a row in a list that means something else.

**The model rejects rather than stubbing.** Legacy's `llmRouter` ends its cascade by *resolving*
with a canned apology tagged `metadata.model === 'static-stub'`. `useChat.ts` checks for it. Nothing
made the next caller check, and a caller that forgets renders an apology as though a coach had said
it. Here `CoachReply` is a union whose failure arm has no `text` field, so there is no success shape
a failure can occupy. `tests/chat-router.test.ts` asserts the property, not the behaviour.

**Five coaches to a table, and the failure copy is never persisted.** Five is the owner's number. The
second is ours: writing "could not reach your coach" into the transcript would make it
indistinguishable from something a coach said, on the next open — and would mark the question as
answered, so reopening could never retry it.

## What this costs

- **Home has no Open Table entry point until the ring gains one.** That is `Orbit.tsx` and
  `catalog.ts`, the other session's files. Until then the bar's chip is the only way to the coach
  sheet: a working screen, and an incomplete one.
- **The bar takes about 74px from the stage, and adds a fourth element to a screen with a rule about
  three.** One element per visual channel — size to the drift number, contrast to the insight,
  colour to the focus pill — now has the send button competing for colour from the opposite corner.
  It reads acceptably at the 412×892 reference size and is the first thing to check on a shorter
  phone.
- **Web threads live in `localStorage`.** `storageAdapter.web.ts` is a deliberate stub and this does
  not change that, but a preview that forgets the conversation on reload reads as a bug rather than
  as "web has no storage". It is per-browser, cleared without warning, and holds nothing but
  thread ids and typed text. Nothing of consequence belongs there and nothing of consequence is
  put there.
- **A thread whose last turn is a question re-asks it when reopened.** That single rule does two
  jobs — it is how the bar on Home hands over without putting what was typed in a URL, and it is how
  an interrupted send recovers. The cost is that a conversation which failed and was left alone will
  try again every time it is opened. Bounded by the router's three attempts, and visible to the
  person as an error each time.
- **The coach cap is enforced in one place and stated in another.** `toggleCoach` refuses the sixth
  coach; the sheet's hint line says so. If a future caller mutates the selection without going
  through `toggleCoach`, the cap is gone and only a test notices.

## What a green check did not catch

Four faults were found by opening the screen, and none of them could have been found any other way.
They are recorded because the ratio is the argument for the rule.

1. **The microphone rendered as a zero with an underline.** A hollow capsule over a bar is a `0̲`.
2. **The coach sheet pushed the orbit out of the frame.** As a flex child it claimed height the
   fixed 404 stage could not give up, and `space-between` shoved the ring under the banner. A sheet
   belongs over the screen, not in the layout.
3. **`maxHeight: '68%'` resolved to nothing**, because the sheet's parent is absolutely positioned
   with no height of its own. The sheet grew to full content and pushed the bar off the frame.
4. **The back link and the title rendered flush** — "← HomeActivity Coach". `Link asChild` puts an
   anchor between the row and the Pressable, and the Pressable's `paddingRight` did not survive it.

A fifth was found and fixed the same way: at `maxHeight: 430` the sheet ended cleanly after Sleep
Coach and read as the whole list, hiding Activity's coaches per sport entirely. A scroll nobody can
see is a scroll nobody makes.

## Not verified

**Dark mode.** `ThemeContext` pins `mode` to `'light'` and no screen can change it, so the dark
palette is unreachable in the running app. Every colour here comes from the theme, so it should
follow — but "should" is not "was seen", and this says which one it is.

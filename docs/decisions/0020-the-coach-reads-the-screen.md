# 0020 — The coach reads the screen, and nothing else

**Status:** accepted, 2026-08-22
**Answers a request from the owner. Extends `0006`, and is bounded by `0017`, `0018` and `0019`.**

## What was wrong

Every coach in the app was told this, and had been since the day the prompt was written:

> *You have no access to this person's health data. Do not invent numbers, history, or
> measurements, and do not imply you can see any. Ask for what you need instead.*

The comment above it explained why: *"The app knows nothing about the person yet — the hubs are
fixtures and nothing is connected."*

That was true on the day. It stopped being true over the following three weeks, one hub at a time.
By 2026-08-22 six hubs held real, typed data — a session, a panel, a meal, a night, how a day felt,
a condition and a medication — and every coach was still being told the app knew nothing.

**So somebody could type their blood panel in, open the Longevity Guide, and be asked what their
markers were.** `0013` is the same shape: a sentence that outlived its truth, still being printed
because nothing was watching the date on it.

## What was built

The coach is told what the app holds. The context is assembled from **the same pure functions the
cockpits render from** — `exercisePeriods`, `labsPeriods`, `nutritionPeriods`, `sleepPeriods`,
`resiliencePeriods`, `medicalPeriods` and `coverageFor` — plus the four things the first run writes
that no cockpit shows: the profile, the goals, the sports named, and what somebody wrote under
*anything you live with*.

### Why not a second summariser

Writing one would have been quicker. It is refused for two reasons, and the first is the one that
matters.

**A coach that can say something the person cannot find on their own screen gives the app two
versions of the truth, and the person is the one who discovers it.** This repository has already
paid for that three times: three components on the Nutrition screen printing three different meal
counts for the same meals; a Labs fixture claiming `34 markers read` on a screen that has never
accepted more than seventeen; a Twin card saying *"nothing logged here yet"* to somebody whose blood
panel sat one hub down, three centimetres below a biological age computed from it.

**And it makes one rule structural instead of remembered.** Every value has been through
`application/format/metric.ts` before this code ever sees it, because that is how the screen got it.
A creatinine stored as `0.8031674208144796` reaches a coach as the app prints it. Nothing downstream
can undo that, because nothing downstream formats a number.

### What that costs, named rather than buried

- **The resilience note does not travel.** Somebody types *"slept badly, big deadline"* against a
  Drained day and the coach never sees it, because `resiliencePeriods` reports the word and not the
  note. This is the principle working exactly as designed, and it is the first place it will feel
  wrong. Fixing it means putting the note on the screen first.
- **Seven days is the ceiling** for meals and nights, because that is the cockpit's window. *"How
  has my protein been this month"* cannot be answered.
- **The Twin's biological age does not travel**, though it is on a screen the person can see. It
  lives in `src/ui/twin/`, which another session owns.
- **The refusals below are re-stated in the prompt, not imported.** The screen captions that say the
  same things live inside `.tsx` files, which a prompt cannot import and bare Node cannot assert.
  Two copies exist and can drift.

### What the marker values nearly cost

`labsPeriods` says how many markers are on the last panel and whether the nine the age calculation
reads are among them. It does not carry the values — those are `YourMarkers`, the block directly
underneath, which prints each one through `formatMeasured(value, marker.unit)`.

On a screen the two sit a finger's width apart. In a prompt they do not, and building only from the
named cockpit functions would have given the Longevity Guide *"9 markers on this panel"* and not one
of them — **a fact about a file rather than about a person**, in the hub the owner named by name.

So `coachContext` adds them, through the same call the screen makes, over the same two lists in the
same order. What is **absent** is named too, because for a coach that is the more useful half: it is
what to ask for rather than what to guess at.

Found by opening the seeded Labs screen. Nothing in CI could have seen it — every test was passing,
and each half was individually correct. That is the third time in this repository a green check has
been wrong about something visible in ten seconds on a rendered page.

### On a screen, and deliberately not carried

Two blocks a person can see do not travel, for two different reasons.

**The weekly logging score — refused.** Nutrition prints `100 out of 100` from three meals across
three days. `summaries.ts` already refused it for the Twin and the reason transfers exactly: *"a
score computed from three of twelve meals is a number that looks like a judgement of a week it did
not see. It belongs on the Nutrition hub, where the meals it is drawn from are visible directly
underneath."* In a prompt it is separated from those meals by definition. `0009` allows exactly one
score and says what it is — **how much you logged, never how you are doing** — and a coach saying
*"your week scored 100"* is the second reading, whatever the caption underneath said.

**The twelve-week heatmap — not built, and named as a gap.** It prints a grid and a lifetime line
(*"All time: 3 sessions, 44 km"*), and *"have I been consistent over three months"* is the Exercise
question that nothing else on that screen answers. It is not carried because turning a grid into
text is a design decision rather than a call to an existing function, and it was outside what was
agreed. **The Exercise Coach can therefore speak about the last seven days and not about the last
twelve weeks.** That is the most likely next thing to want.

The Twin's biological age is a third, already named above.

### The one thing a coach knows that no screen shows

**A note on Health record reaches a coach and is displayed nowhere in the app.** The first run asks
*"anything you live with"* and files the answer as a `note` on `medical`, verbatim. `medicalPeriods`
reads conditions and medications and not notes; `StoredEntries` prints a date and a provenance and
not the text. Nothing in `src/ui/` renders `payload.text` at all — checked, not assumed.

It is carried anyway, because the owner was explicit on 2026-08-22: *"everything that is in the
onboarding ALWAYS needs to be remembered by all coaches."* Everything else onboarding collects is
visible somewhere a person can reach — goals and sports on `/settings/profile` and
`/settings/goals`, the profile on the Twin — so this is the single crack in the rule, and it is
named here rather than discovered later.

**The fix is not in this change.** It is one block on the Health record screen showing what somebody
wrote, which sits in files this session does not own. Until then, a coach can repeat a sentence back
that the person cannot find anywhere in the app — which is a smaller version of exactly the failure
this whole note is written against.

## What the coaches may read — the owner's call, 2026-08-22

Asked whether a coach should see only its own hub, he answered in three parts:

> *"everything that is in the onboarding ALWAYS needs to be remembered by all coaches"*

> *"all the data like the blood panel is the basis of every coach or later when we add genomics or
> best case microbiome stuff for the nutritionist. the data is the fundament of the advice of the
> coaches"*

**So every coach reads every hub.** `docs/product-spec.md` still lists *"whether hub selection
weights the answer or restricts what the coach may use"* as open; this settles the data half of it
and leaves the weighting half open. Narrowing it later is a filter on one list in `coachContext`,
not a rewrite.

Two things are excluded, and neither is a scope decision:

- **A hub that has been put away.** Hiding is a statement about what somebody wants to see, and it
  would be a strange app that honoured it on the ring and ignored it when talking to a coach. The
  same call `src/ui/twin/summaries.ts` makes. Nothing is deleted; the entries come back with the hub.
- **The Open Table**, which is a place on the ring and not a hub. It has never been able to hold
  anything, so a line reporting that it holds nothing would be reporting an absence that was never
  a presence.

## What this makes impossible

**An empty hub does not fall back to "no access".** That sentence says the app cannot see this
person's data. For an empty hub it is false — the app can see it perfectly well and there is nothing
in it. The coach is told *nothing logged in this hub yet*, followed by the coverage list, which is
the app's own statement of what it can and cannot read. It is the same distinction
`twin/summaries.ts` draws between `nothingLogged` and `notBuilt`: one asks somebody to do something,
and the other admits we have not built it.

**Coverage is the half that earns the most.** A coach told *"Heart-rate variability — waits for a
watch"* cannot invent an HRV, and that is a harder floor than any sentence instructing it not to.

**Nothing claims to be the only thing known.** `briefSection` used to close with *"That is the ONLY
thing you know about them"*, which was true while a brief was the only thing there was. Beside a
block of hub facts it is a contradiction, and the resolution a model picks for a contradiction is
never one anybody chose. It is one sentence now, issued last, about all of it.

**A person's own words cannot close the fence they arrive in.** Six fields reaching the prompt are
free text: a condition name, a medication and its dose, a health-record note, a typed goal, a typed
sport, and the label of a hub somebody made. `</` becomes `< /` in every one of them, and in the
brief, which had the same hole. `a < b` and `x > y` are left exactly as typed — they are things
people write about themselves. `SAFETY` is still read after every fence regardless.

## The refusals carried into the prompt

Each one is something this app has already decided it will not do. They are written into the prompt
because **the coach is the one surface that can undo any of them in a single sentence.**

- **A day is a word, never a number.** No score, no ranking of two days, and no describing a run of
  days as improving, declining, or a good week. `0017`.
- **A health record may be repeated and never judged.** No diagnosis, no severity, no suggested
  change to a medication or a dose, and no warning about two medications together — *the refusal
  `0019` calls the one most worth writing down, because it is the one a person is most likely to
  assume the opposite of.*
- **A marker is a number a laboratory printed.** No reference range, and nothing called good, bad,
  high or low. `0018`.
- **A day with nothing logged is a day the app did not see**, never a rest day.
- **Meal figures are averages per meal logged**, never what somebody ate in a day.
- **Anything marked *not read* cannot be inferred from anything else.**

## The layer, because it is not a filing preference

`src/application/` may not import `src/ui/`. So the builder is `src/ui/chat/coachContext.ts`, and
the types it satisfies are declared in `src/application/chat/context.ts` **structurally** — a
`CockpitPeriod` and a `HubFacet` fit them without either side importing the other. That is the same
trick `CoachDescriptor` in `src/core/chat.ts` already uses to let the catalog's `Coach` cross a
layer, and the reason it exists is the same: the catalog stays the one list, and nothing below
`src/ui/` has to reach up to say so.

## What is still off

`EXPO_PUBLIC_GEMINI_API_KEY` remains deliberately unset. `0010` settles it and this does not reopen
it: the machinery is built and tested, and no coach answers. **That is the finished state and it is
not outstanding work.** What this change means is that on the day a key is set, the coaches will
already know what the app holds — rather than a person discovering, on that day, that their coach
had been asking them for a blood panel they typed in weeks earlier.

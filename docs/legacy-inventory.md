# What Legacy still has that OL1 has not used

`github.com/gzug/01-One-L1fe`. Read freely. Counts, settled by a full sweep on 2026-08-19:
**824 files in the repository, 518 under `apps/mobile/src/`, 341 of those non-test, 75,314 lines.**
The "393 source files" this line used to claim was wrong.

**Read all of it at once rather than file by file.** `gh api repos/gzug/01-One-L1fe/tarball` is
1.9 MB; a digest of every non-test file's header comment and export names is 2,448 lines, which is
four passes. Legacy's files carry real header comments, and that is what makes it affordable.

This exists because "we are not reusing enough of Legacy" has been true three times now, and each
time it was found by the owner rather than by us. Twice the cause was searching in OL1's vocabulary
instead of Legacy's — **Fitness** and **Resilience** appear in no Legacy *filename*, so a filename
search reported those domains as empty. Search file **contents**:

```sh
gh api -X GET search/code -f q="<term> repo:gzug/01-One-L1fe"
```

Ordered by what is worth taking, not by size. Everything below is **unused in OL1 as of
2026-08-03**.

---

## 0. What the owner decided — 2026-08-19

A full capability-level review of all 341 files was put to him: 91 capabilities, grouped by the hub
each would live in, each with a recommendation and what is lost by leaving it. His answers:

**Refused, and why** — the Strava demo persona (see section 5, and read it before arguing for it),
a single 0–100 recovery number (it grades a person, which `0004`/`0005` rejected and which
contradicts his own 2026-08-19 rule that the body figure shows LOAD and the coach recommends in
words), Legacy's persona swipe-ring (the orbit occupies that ground), and a second LLM provider plus
the on-device model (he chose one provider; two would be two answers to keep honest).

**Kept, against the earlier refusal** — Legacy's coach system prompts, as a starting draft rather
than as behaviour to port.

**Everything else on the list is wanted**, which is roughly 150 working days. The order he set is
**what you can see, first**: the ring, the store, conversations that stack up, the body figure, then
the chat writing into hubs; then the Legacy work that needs no wearable; the Health Connect pipeline
last, because he is still deferring the phone.

**Narrowed by him** — of the whole generated-message layer (briefs, weekly letter, focus proposals,
anomaly notes, the inbox), he wants **two things**: a morning brief — how you slept, and how much
exercise today or whether to rest — and an evening resume — stress, what you did, and a
recommendation for sleep and recovery. Both are advice, which is consistent rather than a reversal:
the figure shows load, the coach recommends in words. **Both need the phone to be honest**, so the
machinery gets built and stays quiet about sleep and stress until Health Connect is real. Where they
arrive is not decided.

---

## 1. The insight engine — 13 files, and the most valuable thing in Legacy

`data/insights/engine/`. This generates the sentences OL1 currently hand-writes as fixtures
("Your later nights landed on evening training days"), and — far more importantly — it **stops a
model inventing health numbers**.

- **`numericGrounding.ts`** — rejects any number in LLM output that is not grounded in the facts it
  was given. It allows trivially derivable variants (rounding, `7h30`, metres → km) and rejects
  everything else *including computed differences*, because pairwise arithmetic over a fact set
  grounds far too many unrelated numbers. Its own stated philosophy: *"a false rejection costs a
  slightly blander text; a false acceptance puts an invented health number in front of the user."*
- **`validateInsightPhrasing.ts`** — an insight may only be phrased from a closed set of established
  content, and the verdict names why it failed (`missing_transparency`, and others).
- `factAssembler.ts`, `knowledgeBase.ts`, `synthesize.ts`, `phraseInsight.ts`, `presentInsight.ts`,
  `softNotes.ts`, `transparencyNote.ts`, `buildInsightFeed.ts`, `chatInsightsBridge.ts`.

**Correction, 2026-08-03.** An earlier version of this file called the grounding guard urgent
because "the chat is live and has no guard". That was wrong on inspection.

`numericGrounding` checks that every number in a generated text appears in the **facts that text was
built from**. It is built for statements ABOUT the user's data — briefs, anomaly notes, weekly
letters, insight phrasing. **OL1 generates none of those yet**; its hub sentences are hand-written
fixtures.

Pointed at open conversation it would be actively wrong: a coach saying "most adults need seven to
nine hours" is general knowledge, not a claim about this person, and the guard would reject it. The
chat's real protection today is in `src/application/chat/prompt.ts`, which tells the model it has no
access to the person's data and must not invent numbers or measurements.

**So: port this the day the first generated insight exists, and not before.** It has no surface to
guard until then.

## 2. Labs — 24 files, against a five-row cockpit

**Labs lives inside the Medical condition hub since 2026-08-19.** Its hub id is still `labs` and
every path built for panels still routes through it.

The largest gap between what Legacy had and what OL1 shows.

- ~~`services/phenoAgeService.ts`~~ — **TAKEN**, as `src/application/labs/phenoAge.ts`. The Levine
  calculator, coefficients and unit conversions intact, plus its two refusals: null rather than a
  number it cannot stand behind, and a RANGE rather than a point when the panel is partial.
- **`data/insights/bioAgeDrivers.ts`** — which markers drive that number, and a structural honesty
  guard worth copying on its own: the `DriverItem` type **deliberately omits** the numeric impact,
  making it *impossible* to render a year figure from that path. Design by type, not by discipline.
- `data/insights/bloodChangeRows.ts` — what changed since the last panel.
- `data/biomarkerTiers.ts` — which markers matter most.
- `data/insights/biomarkerRollups.ts`, `BloodGroupList.tsx` — results grouped by category.
- `BiomarkerTrendsView.tsx`, `data/insights/sparklinePath.ts` — a marker over time.
- `services/labMissingnessService.ts` — what a panel did *not* include.
- `services/levineExtraction.ts`, `localLabHeuristics.ts`, `labReviewService.ts` — the extraction
  behind the verification gate OL1 already built.
- `BloodResultsScreenV2.tsx`, `BloodPanelEditScreen.tsx`, `insights/tabs/LabsAgeTab.tsx`.

## 3. Briefs, anomalies and the weekly letter — 13 files

`data/messages/`. Home's Daily Focus and Weekly Insight are hand-written fixtures in OL1; Legacy
generates them and guards them.

- `anomalyGenerators.ts`, `anomalyNoteLogic.ts` — what counts as worth mentioning.
- `briefGeneratorLogic.ts` — morning brief and evening resume, **pure and DB-free so it is testable
  in bare Node**, and it enforces a PHI scrub rule: prompts emit only whitelisted numeric facts and
  the date — no display name, no source strings, no record ids. It already calls
  `findUngroundedNumbers`.
- `weeklyGenerators.ts`, `weeklyLetterLogic.ts`, `focusActions.ts`, `messageCenterStore.ts`.

## 4. Per hub

**Nutrition** (`data/nutrition/`, 9 files) — `nutritionScore.ts` scores quality with sub-scores for
protein, fibre and whole food, and carries an explicit `confidence` of Low/Med/High rather than
pretending. `nutritionTargets.ts`, `nutritionBaselineService.ts`, `nutritionLogStore.ts`,
`nutritionHubHelpers.ts`. Also `nutritionHomeBlock.ts`, whose `MIN_DAYS_FOR_A_WEEKLY_CLAIM` is
already cited in `docs/decisions/0005-the-hub-model.md`.

**Sleep** — `data/home/sleepRingModel.ts` (its three rules are already honoured in OL1's fixture, the
machinery is not), `sleepStageBreakdownLoader.ts`, `components/home/SleepRing.tsx`.

**Exercise** (Legacy's *Fitness*; the hub was renamed from Activity on 2026-08-19) —
`activityHeatmap.ts`, `activityHubData.ts`, `gpxParser.ts`, `routeCountryLookup.ts`,
`exerciseTypeLabels.ts` (the Health Connect enum → label map, ~90 entries). `exerciseTypeLabels` is
newly load-bearing: it is the vocabulary the body figure's muscle map needs to know that one code is
a run and another is a gym session.

**Resilience** — `data/persona/recoverySignals.ts`, `todayRecoveryScore.ts`,
`insights/wearableTrendOverview.ts`, `wearableRadarSummary.ts`.

**Cross-hub** — `data/insights/nutritionLabConnections.ts` links two domains, which nothing in OL1
does yet.

## 5. Deliberately not taken

- **`data/demo/stravaDemoActivities.ts`** — 258 rows with Strava ids, German auto-generated titles
  and heart rates, under a source constant named `strava_export`. **Its header calls it synthetic
  and that is false.** Asked directly on 2026-08-19, the owner said: *"It was a manual export that
  we uploaded from the Strava app."* So it is a real person's training history, the generated header
  claiming otherwise is wrong, and the Legacy repository is public. Not ported, and the owner has
  been asked what he wants done about Legacy itself — that is his call, not this repository's.
  Its dependants go with it: `stravaDemoSeed.ts`, `stravaActivityTags.ts`, `stravaActivityFilters.ts`.
- **Garmin cloud** (`services/garminCloudPuller.ts`, `data/health/garminCloudIngest.ts`) — the owner
  chose Health Connect instead. Body Battery, Garmin Stress and Training Load do not survive that
  choice; HRV and SpO2 do.
- ~~**Coach system prompts**~~ — **un-refused 2026-08-19.** The owner wants them as a starting
  draft. They still name a product and a scope this spec has not settled, so they are a draft to
  rewrite from, never text to ship.
- **A second LLM provider and the on-device model** (`openRouterAdapter.ts`, `localLlamaAdapter.ts`,
  `localModelManager.ts`, `localLlmRuntimeProbe.ts`) — one provider was chosen; a 2GB local model is
  a project of its own.
- **A single 0–100 recovery number** (`data/persona/todayRecoveryScore.ts`) — it grades a person.
- **The persona swipe-ring** (`data/persona/personaModel.ts`) — the orbit occupies that ground.
- **`data/deviceUsage/`** (7 files) — screen time. No hub claims it.

## How to use this file

Before designing anything for a hub, look here first. When something is taken, delete its line and
say so in the commit. When something is deliberately refused, move it to section 5 with the reason —
a rejected line is as useful as a taken one, and it is the only thing that stops the same argument
being had twice.

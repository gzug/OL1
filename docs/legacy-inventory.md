# What Legacy still has that OL1 has not used

`github.com/gzug/01-One-L1fe`, 393 source files under `apps/mobile/src/`. Read freely.

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

**Activity** — `activityHeatmap.ts`, `activityHubData.ts`, `gpxParser.ts`, `routeCountryLookup.ts`,
`exerciseTypeLabels.ts` (the Health Connect enum → label map, ~90 entries).

**Resilience** — `data/persona/recoverySignals.ts`, `todayRecoveryScore.ts`,
`insights/wearableTrendOverview.ts`, `wearableRadarSummary.ts`.

**Cross-hub** — `data/insights/nutritionLabConnections.ts` links two domains, which nothing in OL1
does yet.

## 5. Deliberately not taken

- **`data/demo/stravaDemoActivities.ts`** — 258 rows with real-looking Strava ids, German
  auto-generated titles and heart rates, under a source constant named `strava_export`. Its header
  calls it synthetic; the data reads like a real export. Not ours to republish either way.
- **Garmin cloud** (`services/garminCloudPuller.ts`, `data/health/garminCloudIngest.ts`) — the owner
  chose Health Connect instead. Body Battery, Garmin Stress and Training Load do not survive that
  choice; HRV and SpO2 do.
- **Coach system prompts** — they name a product and a scope this spec has not settled.
- **`data/deviceUsage/`** (7 files) — screen time. No hub claims it.

## How to use this file

Before designing anything for a hub, look here first. When something is taken, delete its line and
say so in the commit. When something is deliberately refused, move it to section 5 with the reason —
a rejected line is as useful as a taken one, and it is the only thing that stops the same argument
being had twice.

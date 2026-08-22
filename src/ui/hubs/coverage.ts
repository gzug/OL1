import { entriesThisWeek, weekOfEntries } from '@/application/hubs/weekly';
import type { HubEntry } from '@/core/hubs';
import type { HubFacet } from '@/ui/hubs/hubState';
import { SESSION_TYPES } from '@/ui/exercise/session';
import { LEVINE_MARKERS } from '@/ui/labs/levine';
import { EXTRA_MARKERS } from '@/ui/labs/lipids';
import { dayWordLabel } from '@/ui/resilience/day';

/**
 * What each hub can and cannot see, from what it actually holds.
 *
 * Coverage was the last invented block on a hub screen. It is also the block where being invented
 * matters most: **its entire job is to say what this hub reads**, so a sample row claiming a
 * capability is a sample row lying about the app's shape rather than about a number.
 *
 * Two of them were doing exactly that. Sleep claimed to read a rhythm from bed and wake times
 * nothing records — fixed in `#120`. Resilience claims to read heart-rate variability and resting
 * heart rate on six of the last seven nights, and reads neither: both need a watch, and the phone
 * is deferred. Those become `missing`, which is what they are.
 *
 * **The whole list comes from here for a hub that has one**, rather than being merged row-by-row
 * into the fixture's. Merging by label is how a renamed row silently stops being updated — the
 * failure `hub-states.test.ts` had to guard against by name until the rows it watched were real.
 *
 * Returns null for a hub with nothing real yet, and `HubScreen` falls back to the fixture.
 */

/** Not connected, and honest about it. The same sentence everywhere it is true. */
const NOT_CONNECTED = 'Not connected yet';

/** Waiting on the phone, which is a different absence from "not built". */
const WAITS_FOR_A_WATCH = 'Waits for a watch — the phone is not connected yet';

function countOf(entries: readonly HubEntry[], kind: string): number {
  return entries.filter((entry) => entry.kind === kind).length;
}

function exercise(entries: readonly HubEntry[], now: string): readonly HubFacet[] {
  const week = weekOfEntries(entries, 'session', now);
  const named = new Set(
    entriesThisWeek(entries, 'session', now)
      .map((entry) => entry.payload.activity)
      .filter((activity): activity is string => typeof activity === 'string'),
  );
  const labels = SESSION_TYPES.filter((type) => named.has(type.id)).map((type) => type.label);

  return [
    {
      detail:
        week.total === 0
          ? 'Nothing logged in the last 7 days'
          : `${week.total} in the last 7 days, across ${week.days} of them`,
      label: 'Sessions',
      state: week.total === 0 ? 'missing' : 'reading',
    },
    {
      detail: labels.length === 0 ? 'Nothing logged in the last 7 days' : labels.join(', '),
      label: 'Exercise types',
      state: labels.length === 0 ? 'missing' : 'reading',
    },
    { detail: 'Shared with Sleep', label: 'Recovery', state: 'elsewhere' },
    { detail: NOT_CONNECTED, label: 'Routes', state: 'missing' },
  ];
}

function labs(entries: readonly HubEntry[]): readonly HubFacet[] {
  const panels = entries
    .filter((entry) => entry.kind === 'panel')
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  const last = panels[0];
  const markers = last === undefined ? 0 : markersOn(last);

  return [
    {
      detail:
        last === undefined
          ? 'No panel yet'
          : `${markers} ${markers === 1 ? 'marker' : 'markers'} on your last panel`,
      label: 'Blood panel',
      state: last === undefined ? 'missing' : 'reading',
    },
    {
      /* One panel is a point. The same sentence `PanelAge` and the Twin both make, with the count
         behind it — and it is the reason "Trends" is `missing` rather than `reading` at one. */
      detail:
        panels.length >= 2
          ? `${panels.length} panels, so a marker can be followed`
          : 'One panel is a reading. A second makes it a line',
      label: 'Trends',
      state: panels.length >= 2 ? 'reading' : 'missing',
    },
    { detail: NOT_CONNECTED, label: 'Genomics', state: 'missing' },
    { detail: NOT_CONNECTED, label: 'Microbiome', state: 'missing' },
  ];
}

function markersOn(entry: HubEntry): number {
  const markers = entry.payload.markers;
  if (typeof markers !== 'object' || markers === null) return 0;

  const held = markers as Readonly<Record<string, unknown>>;
  return [...LEVINE_MARKERS, ...EXTRA_MARKERS].filter((marker) => {
    const value = held[marker.key];
    return typeof value === 'number' && Number.isFinite(value);
  }).length;
}

function nutrition(entries: readonly HubEntry[], now: string): readonly HubFacet[] {
  const week = weekOfEntries(entries, 'meal', now);
  const weighed = countOf(entries, 'weight');

  return [
    {
      detail:
        week.total === 0
          ? 'Nothing logged in the last 7 days'
          : `${week.total} logged across ${week.days} of the last 7 days`,
      label: 'Meals',
      state: week.total === 0 ? 'missing' : 'reading',
    },
    {
      /* A meal records five macros and no vitamins. The fixture pointed at a lab report, which is
         a different hub's data and not what "micronutrients" would mean here. */
      detail: 'Meals record macros, not vitamins and minerals',
      label: 'Micronutrients',
      state: 'missing',
    },
    { detail: 'Shared with Labs', label: 'Biomarkers', state: 'elsewhere' },
    {
      detail: weighed === 0 ? 'None yet' : `${weighed} on file, at most one a day`,
      label: 'Weight',
      state: weighed === 0 ? 'missing' : 'reading',
    },
    { detail: NOT_CONNECTED, label: 'Hydration', state: 'missing' },
    { detail: NOT_CONNECTED, label: 'Body composition', state: 'missing' },
  ];
}

function sleep(entries: readonly HubEntry[], now: string): readonly HubFacet[] {
  const week = weekOfEntries(entries, 'night', now);

  return [
    {
      detail:
        week.total === 0
          ? 'No nights typed in yet'
          : `${week.total} of the last 7 nights, typed in by you`,
      label: 'Time asleep',
      state: week.total === 0 ? 'missing' : 'reading',
    },
    { detail: 'Bed and wake times are not asked for yet', label: 'Rhythm', state: 'missing' },
    { detail: 'Shared with Resilience', label: 'Resting heart rate', state: 'elsewhere' },
    { detail: 'Needs a watch that names itself', label: 'Sleep stages', state: 'missing' },
  ];
}

function medical(entries: readonly HubEntry[]): readonly HubFacet[] {
  const conditions = countOf(entries, 'condition');
  const medications = countOf(entries, 'medication');

  return [
    {
      detail: conditions === 0 ? 'None recorded yet' : `${conditions} recorded, in your words`,
      label: 'Conditions',
      state: conditions === 0 ? 'missing' : 'reading',
    },
    {
      detail: medications === 0 ? 'None recorded yet' : `${medications} recorded, in your words`,
      label: 'Medications',
      state: medications === 0 ? 'missing' : 'reading',
    },
    { detail: 'Inside this hub, in Labs', label: 'Blood panels', state: 'elsewhere' },
    {
      /* Not "not connected yet". Nothing is coming that would connect it — this would be a way to
         record a symptom over time, and no such flow exists or is planned. */
      detail: 'No way to record one yet',
      label: 'Symptoms over time',
      state: 'missing',
    },
    { detail: NOT_CONNECTED, label: 'Appointments and letters', state: 'missing' },
  ];
}

function resilience(entries: readonly HubEntry[], now: string): readonly HubFacet[] {
  const week = entriesThisWeek(entries, 'day', now).filter((entry) => {
    const word = entry.payload.word;
    return typeof word === 'string' && dayWordLabel(word) !== null;
  }).length;

  return [
    {
      detail: week === 0 ? 'No days described yet' : `${week} of the last 7 days, in your words`,
      label: 'How the day felt',
      state: week === 0 ? 'missing' : 'reading',
    },
    /**
     * **These two claimed to be reading and read nothing.** The fixture said "6 of the last 7
     * nights" for both, in green, on the block whose only job is to say what this hub can see.
     * Both need a watch. Health Connect carries them, so they arrive with the phone rather than
     * never — which is a different absence from Body Battery below, and is worded differently.
     */
    { detail: WAITS_FOR_A_WATCH, label: 'Heart-rate variability', state: 'missing' },
    { detail: WAITS_FOR_A_WATCH, label: 'Resting heart rate', state: 'missing' },
    {
      detail: 'Garmin only — not in Health Connect',
      label: 'Body battery',
      state: 'missing',
    },
    { detail: 'Garmin only — not in Health Connect', label: 'Stress score', state: 'missing' },
  ];
}

export function coverageFor(
  hubId: string,
  entries: readonly HubEntry[],
  now: string,
): readonly HubFacet[] | null {
  switch (hubId) {
    case 'exercise':
      return exercise(entries, now);
    case 'labs':
      return labs(entries);
    case 'medical':
      return medical(entries);
    case 'nutrition':
      return nutrition(entries, now);
    case 'resilience':
      return resilience(entries, now);
    case 'sleep':
      return sleep(entries, now);
    default:
      /* A hub somebody invented has no coverage to state. */
      return null;
  }
}

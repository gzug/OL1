/**
 * What the Twin can honestly say about your biological age, given what it has.
 *
 * **Pure, and separate from the hook that loads the data, for one reason: it is testable.** The
 * decision here is the whole of the honesty — which state to be in, and what is missing — and a
 * decision that only exists inside a React effect cannot be asserted in bare Node. `muscleLoad.ts`
 * is split the same way and for the same reason.
 *
 * **Both inputs are required and neither is guessed.** No panel means no number. No birth year means
 * no number either — chronological age is an argument to the Levine formula, not a nicety, and the
 * app stores the year rather than the age so it never goes stale.
 *
 * The four states this returns are the four things that can be true, and each one says which it is.
 * `waiting` naming its reason is what separates a screen that is waiting from a screen that is
 * broken; without it, both render as an empty space.
 */

import {
  bioAgeDrivers,
  computePhenoAgeRange,
  type BioAgeDrivers,
  type PhenoAgeRange,
} from '@/application/labs/phenoAge';
import { ageFrom } from '@/application/profile/profile';
import type { HubEntry } from '@/core/hubs';

/** What went into the calculation, in the formula's own units, plus how it was typed. */
export type PanelInputs = {
  readonly chronologicalAge: number;
  readonly markers: Readonly<Record<string, number>>;
  /** Only where a laboratory's unit differed from the formula's, so the screen can show the swap. */
  readonly unitsAsEntered: Readonly<Record<string, string>>;
};

export type BioAge =
  /**
   * **Nothing has been looked up yet, or the lookup failed.**
   *
   * Distinct from `waiting`, which is a claim: *you have no panel*. This one is the absence of a
   * claim, and it is what the hook holds before its first read and what its `catch` leaves behind.
   * Rendering the two the same way meant a store that would not open told a person their blood
   * results were not there — see `docs/decisions/0013`, shape 1.
   */
  | { readonly status: 'unknown' }
  | { readonly reason: 'noPanel' | 'noYear'; readonly status: 'waiting' }
  | {
      readonly drawnAt: string;
      readonly drivers: BioAgeDrivers | null;
      readonly range: Extract<PhenoAgeRange, { status: 'ready' }>;
      readonly status: 'ready';
      /**
       * Exactly what the formula was given. Carried on the state rather than re-read later, so the
       * screen that explains the number cannot drift from the number — the owner asked for a way to
       * see “how it was calculated and which values from the blood panel have been used”, and an
       * explanation assembled from a second read of the store is an explanation that can be wrong.
       */
      readonly used: PanelInputs;
    }
  | { readonly range: PhenoAgeRange; readonly status: 'calibrating' };

/**
 * The markers off a stored panel, defensively.
 *
 * A `hub_entry` payload is JSON that came out of a database, so its shape is a claim rather than a
 * guarantee. Anything that is not a finite positive number is dropped here rather than reaching the
 * formula — `computePhenoAgeRange` would refuse it anyway, but it would refuse the whole panel
 * rather than the one bad marker.
 */
function unitsOf(payload: Readonly<Record<string, unknown>>): Record<string, string> {
  const raw = payload.unitsAsEntered;
  if (typeof raw !== 'object' || raw === null) return {};

  const units: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string' && value.length > 0) units[key] = value;
  }
  return units;
}

function markersOf(payload: Readonly<Record<string, unknown>>): Record<string, number> {
  const raw = payload.markers;
  if (typeof raw !== 'object' || raw === null) return {};

  const markers: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) markers[key] = value;
  }
  return markers;
}

/**
 * The newest panel by the date the blood was DRAWN.
 *
 * `recordedAt` is when the thing happened, which for a panel is the draw date rather than the day
 * somebody typed it in — so a panel from March entered today does not displace one from August.
 * That distinction is written into the schema and this is one of the places it earns its keep.
 */
function newestPanel(entries: readonly HubEntry[]): HubEntry | undefined {
  return entries
    .filter((entry) => entry.kind === 'panel')
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
}

export function bioAgeFrom(
  entries: readonly HubEntry[],
  birthYear: number | null,
  today: Date,
): BioAge {
  const panel = newestPanel(entries);
  if (panel === undefined) return { reason: 'noPanel', status: 'waiting' };

  const chronologicalAge = ageFrom(birthYear, today);
  if (chronologicalAge === null) return { reason: 'noYear', status: 'waiting' };

  const input = { chronologicalAge, markers: markersOf(panel.payload) };
  const range = computePhenoAgeRange(input);

  /**
   * A partial panel gives a bracket rather than a figure, and below six markers not even that.
   * `computePhenoAgeRange` already refuses; this renders the refusal rather than reaching past it
   * to `computePhenoAge` and printing whatever falls out.
   */
  if (range.status !== 'ready') return { range, status: 'calibrating' };

  return {
    drawnAt: panel.recordedAt,
    drivers: bioAgeDrivers(input),
    range,
    status: 'ready',
    used: { ...input, unitsAsEntered: unitsOf(panel.payload) },
  };
}

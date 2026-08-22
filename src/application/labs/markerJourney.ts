/**
 * One marker across every panel you have.
 *
 * The last of the Legacy labs inventory that was buildable — `BiomarkerTrendsView` there, and it
 * finally has enough markers to be worth drawing: nine the formula reads plus eight it does not.
 *
 * **Three panels before anything is drawn, and that is the whole discipline.** `panelChange.ts`
 * already establishes that two panels are a line and not a trend; a sparkline through two points
 * makes exactly the claim that rule refuses, and makes it in a shape people read faster than they
 * read a sentence. Two panels get the two numbers and the words that already exist.
 *
 * Pure. Panels in, a series out; `sparkline.ts` turns it into a path and the screen draws it.
 */

import type { HubEntry } from '@/core/hubs';

import { EXTRA_MARKER_ORDER, EXTRA_TARGET_UNIT, TARGET_UNIT } from './units';
import { REQUIRED_MARKERS } from './phenoAge';

/** Below this a line implies a direction the panels cannot support. See `panelChange.ts`. */
export const PANELS_FOR_A_LINE = 3;

export type JourneyPoint = {
  /** `YYYY-MM-DD`, the day the blood was DRAWN. */
  readonly on: string;
  readonly value: number;
};

export type MarkerJourney = {
  readonly key: string;
  /** Oldest first, so the line reads left to right the way a date does. */
  readonly points: readonly JourneyPoint[];
  readonly unit: string;
};

function markersOf(payload: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const found = payload.markers;
  return typeof found === 'object' && found !== null ? (found as Record<string, unknown>) : {};
}

/** Every marker a panel can hold, in the order a panel prints them. */
export const JOURNEY_ORDER: readonly string[] = [...REQUIRED_MARKERS, ...EXTRA_MARKER_ORDER];

function unitOf(key: string): string {
  return Object.prototype.hasOwnProperty.call(TARGET_UNIT, key)
    ? TARGET_UNIT[key as keyof typeof TARGET_UNIT]
    : (EXTRA_TARGET_UNIT[key as keyof typeof EXTRA_TARGET_UNIT] ?? '');
}

/**
 * The journeys worth drawing, in panel order.
 *
 * **A marker is only included where it appears on at least `PANELS_FOR_A_LINE` panels** — not where
 * that many panels exist. Somebody who added cholesterol to their third panel has one reading of
 * it, and a chart of one reading among three dates would draw a line from nothing.
 *
 * Panels are ordered by when the blood was DRAWN, never by when they were typed in. That
 * distinction is written into the schema and this is the fourth place it earns its keep.
 */
export function markerJourneys(entries: readonly HubEntry[]): readonly MarkerJourney[] {
  const panels = entries
    .filter((entry) => entry.kind === 'panel')
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  return JOURNEY_ORDER.map((key) => {
    const points: JourneyPoint[] = [];

    for (const panel of panels) {
      const value = markersOf(panel.payload)[key];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        points.push({ on: panel.recordedAt.slice(0, 10), value });
      }
    }

    return { key, points, unit: unitOf(key) };
  }).filter((journey) => journey.points.length >= PANELS_FOR_A_LINE);
}

/**
 * How far a marker has moved across the whole journey, as a fraction of where it started.
 *
 * **Direction only, and no verdict.** Whether a rising marker is good or bad is a clinical
 * judgement this app does not make — the same refusal `bioAgeDrivers` makes by carrying a direction
 * and a rank and no number at all.
 */
export function journeyMove(journey: MarkerJourney): 'down' | 'level' | 'up' {
  const first = journey.points[0]?.value;
  const last = journey.points[journey.points.length - 1]?.value;
  if (first === undefined || last === undefined || first === 0) return 'level';

  const move = (last - first) / first;
  // The same tenth `panelChange` uses, and for the same reason: below it, this is assay spread.
  if (move >= 0.1) return 'up';
  if (move <= -0.1) return 'down';
  return 'level';
}

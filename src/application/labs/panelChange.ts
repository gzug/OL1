/**
 * What changed between your last two panels.
 *
 * The app says in three separate places that a second panel is what turns a reading into a
 * direction — on the Twin, in the Labs cockpit, and in `panelRecency`. **Until now nothing behind
 * that sentence existed.** A promise a product repeats and cannot keep is worse than one it never
 * made, so this is the machinery that makes it true the day a second panel arrives.
 *
 * **Two panels are a line, not a trend, and nothing here may call them one.** That is the whole
 * discipline of this file. Blood moves for reasons that have nothing to do with a person's health
 * trajectory — the time of day, hydration, a hard session, a cold two weeks ago, and the ordinary
 * analytical variation of the assay itself. A marker that reads 4.4 and then 4.5 has not "improved".
 *
 * Pure, like everything else under `application/labs/`.
 */

import { REQUIRED_MARKERS } from './phenoAge';
import { TARGET_UNIT, type LevineMarkerKey } from './units';

/**
 * How much a marker has to move before the change is worth showing as a direction rather than as
 * two numbers, expressed as a fraction of the earlier value.
 *
 * **Ten per cent, and it is a deliberately blunt instrument.** The honest number would be each
 * assay's own reference change value — the combination of analytical imprecision and within-person
 * biological variation, which differs per marker and per laboratory. Those figures are published
 * but they are not in this repository, and inventing nine of them would be worse than one stated
 * threshold that is obviously a rule of thumb.
 *
 * The consequence is stated on screen rather than hidden: below this, the two values are shown and
 * no direction is claimed.
 */
export const MEANINGFUL_CHANGE = 0.1;

export type MarkerChange = {
  /** `null` when the marker was on only one of the two panels. */
  readonly direction: 'down' | 'same' | 'up' | null;
  readonly from: number | null;
  readonly key: LevineMarkerKey;
  /** True only when the move clears `MEANINGFUL_CHANGE`. Small moves are shown, never described. */
  readonly notable: boolean;
  readonly to: number | null;
  readonly unit: string;
};

export type PanelComparison = {
  readonly changes: readonly MarkerChange[];
  /** Whole days between the two draws. A change over six days is a different claim to one over a year. */
  readonly daysApart: number;
  /** Markers on exactly one of the two panels, so the screen can say why a row is half empty. */
  readonly onlyOnOne: readonly LevineMarkerKey[];
};

function daysBetween(earlier: string, later: string): number {
  const ms = new Date(later).getTime() - new Date(earlier).getTime();
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86_400_000)) : 0;
}

function usable(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function comparePanels(
  earlier: { markers: Readonly<Record<string, unknown>>; recordedAt: string },
  later: { markers: Readonly<Record<string, unknown>>; recordedAt: string },
): PanelComparison {
  const changes: MarkerChange[] = [];
  const onlyOnOne: LevineMarkerKey[] = [];

  for (const key of REQUIRED_MARKERS) {
    const from = earlier.markers[key];
    const to = later.markers[key];
    const hasFrom = usable(from);
    const hasTo = usable(to);

    if (!hasFrom && !hasTo) continue;

    if (!hasFrom || !hasTo) {
      onlyOnOne.push(key);
      changes.push({
        direction: null,
        from: hasFrom ? from : null,
        key,
        notable: false,
        to: hasTo ? to : null,
        unit: TARGET_UNIT[key],
      });
      continue;
    }

    const move = (to - from) / from;

    changes.push({
      direction: to > from ? 'up' : to < from ? 'down' : 'same',
      from,
      key,
      notable: Math.abs(move) >= MEANINGFUL_CHANGE,
      to,
      unit: TARGET_UNIT[key],
    });
  }

  return {
    changes,
    daysApart: daysBetween(earlier.recordedAt, later.recordedAt),
    onlyOnOne,
  };
}

/**
 * How to describe the gap, in the words a person uses.
 *
 * Panels drawn days apart are a different claim from panels a year apart, and a screen that shows
 * two numbers without the interval invites the reader to supply their own.
 */
export function apartInWords(days: number): string {
  if (days === 0) return 'drawn the same day';
  if (days === 1) return 'a day apart';
  if (days < 30) return `${days} days apart`;
  const months = Math.round(days / 30.44);
  if (months < 24) return months === 1 ? 'about a month apart' : `about ${months} months apart`;
  return `about ${Math.round(days / 365.25)} years apart`;
}

/**
 * What the Twin says about your biological age, in words.
 *
 * Copy lives in a plain `.ts` rather than inside the component for the reason
 * `src/ui/labs/markerContext.ts` does: **a sentence in a `.tsx` cannot be asserted in bare Node**,
 * and these particular sentences are the honesty of the screen rather than decoration around it.
 *
 * The rule they exist to keep is that every line agrees with the number above it. The Twin shipped
 * a fixture reading “9 of 9 markers, from the panel drawn 12 Mar” directly under a line saying no
 * panel had been added — two halves of one screen contradicting each other on the deployed preview,
 * which is what half-fixing a dishonest screen produces.
 */

import type { PhenoAgeRange } from '@/application/labs/phenoAge';
import type { BioAge } from '@/application/twin/bioAge';
import { LEVINE_MARKERS } from '@/ui/labs/levine';

const MARKER_LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  LEVINE_MARKERS.map((marker) => [marker.key, marker.label]),
);

/** The marker's own name. Never with a number beside it — see the note on `BioAgeDriver`. */
export function markerName(key: string): string {
  return MARKER_LABEL[key] ?? key;
}

/** Years, one decimal. Rounded on tenths rather than `toFixed`, so −0.04 cannot print as “-0.0”. */
export function years(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

export function drawnOn(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? 'an unknown date'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * The “Blood work” row under *What this number is made of*, from the same state as the number.
 *
 * This is the line that contradicted itself. It must never claim markers the calculation does not
 * have, and `tests/bio-age.test.ts` asserts exactly that across every state.
 */
export function bloodWorkSource(bioAge: BioAge): {
  detail: string;
  label: string;
  state: 'missing' | 'reading';
} {
  const label = 'Blood work';

  if (bioAge.status === 'waiting') {
    return {
      detail: bioAge.reason === 'noPanel' ? 'No panel added yet' : 'Waiting on your year of birth',
      label,
      state: 'missing',
    };
  }

  if (bioAge.status === 'calibrating') {
    const present =
      bioAge.range.status === 'calibrating' ? bioAge.range.markersPresent : 9 - bioAge.range.missing.length;
    return { detail: `${present} of 9 markers — not enough yet`, label, state: 'missing' };
  }

  const present = 9 - bioAge.range.missing.length;
  return { detail: `${present} of 9 markers, drawn ${drawnOn(bioAge.drawnAt)}`, label, state: 'reading' };
}

/** What a panel is missing, said in the shape the screen needs it. */
export function missingLine(range: PhenoAgeRange): string {
  if (range.status === 'calibrating') {
    return `${range.markersPresent} of 9 markers. Six are needed before this can say anything honest.`;
  }

  const names = range.missing.map(markerName);
  if (names.length === 0) return 'All nine markers are present.';
  return names.length === 1
    ? `A range rather than a figure: ${names[0]} was not on the panel.`
    : `A range rather than a figure: ${names.length} markers were not on the panel.`;
}

/** The line the waiting state shows, which names WHICH input is missing rather than going blank. */
export function waitingLine(reason: 'noPanel' | 'noYear'): string {
  return reason === 'noPanel'
    ? 'Biological age needs a blood panel. Nothing has been added yet.'
    : 'Biological age needs the year you were born. It is not stored until you give it.';
}

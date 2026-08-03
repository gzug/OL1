/**
 * Levine PhenoAge — the number the Digital Twin shows.
 *
 * PORTED from Legacy `services/phenoAgeService.ts`, coefficients and all. Reference: Levine et al.
 * (2018), "An epigenetic biomarker of aging for lifespan and healthspan", Aging 10(4):573-591.
 *
 * It takes exactly the nine markers `src/ui/labs/levine.ts` already collects, which is why this was
 * the first thing worth taking from Legacy: the panel flow was built to feed it before anyone
 * noticed the calculator existed.
 *
 * Three of Legacy's decisions are carried over because each one is a refusal to guess:
 *
 * 1. **It returns null rather than a number it cannot stand behind.** A missing marker, a
 *    non-finite age, or an intermediate that leaves the valid domain all end the calculation. There
 *    is no default, no substitution, no "best effort".
 * 2. **A partial panel gets a RANGE, not a point.** `computePhenoAgeRange` substitutes the
 *    reference bounds for what is missing and reports the low and high that produces. Six markers
 *    can honestly say "somewhere between", and cannot honestly say "41.6".
 * 3. **Below six markers it says `calibrating` and stops.** Not a wide range, not a caveated
 *    figure — no figure.
 *
 * Lives under `src/application/` because `AGENTS.md` keeps screens and routes away from anything
 * like this, and because it is pure: no React, no storage, no clock. It is testable in bare Node,
 * which is how Legacy wrote it too.
 */

import type { LevineMarkerKey } from '@/ui/labs/levine';

/** Conversions from the units the panel is entered in to the units the 2018 paper uses. */
const ALBUMIN_GL_PER_GDL = 10;
const CREATININE_UMOLL_PER_MGDL = 88.4;
const CRP_MGL_PER_MGDL = 10;
const GLUCOSE_MMOLL_TO_MGDL = 18.0182;

/**
 * Reference bounds, used ONLY to bracket a partial panel. These are not a verdict on any value and
 * nothing may render them as one — a result inside them is not "good".
 */
export const REFERENCE_BOUNDS: Readonly<Record<LevineMarkerKey, { max: number; min: number }>> = {
  albumin: { max: 5.0, min: 3.5 },
  alp: { max: 120, min: 40 },
  creatinine: { max: 1.2, min: 0.6 },
  crp: { max: 3.0, min: 0.1 },
  glucose: { max: 100, min: 70 },
  lymph_pct: { max: 40, min: 20 },
  mcv: { max: 100, min: 80 },
  rdw: { max: 14.5, min: 11.5 },
  wbc: { max: 11.0, min: 4.0 },
};

export const REQUIRED_MARKERS: readonly LevineMarkerKey[] = [
  'albumin',
  'creatinine',
  'glucose',
  'crp',
  'lymph_pct',
  'mcv',
  'rdw',
  'alp',
  'wbc',
];

export type PhenoAgeInput = {
  readonly chronologicalAge: number;
  readonly markers: Partial<Record<LevineMarkerKey, number>>;
};

export type PhenoAgeRange =
  | {
      readonly high: number;
      readonly markersPresent: number;
      readonly missing: readonly LevineMarkerKey[];
      readonly low: number;
      readonly point: number;
      readonly status: 'ready';
    }
  | {
      readonly markersPresent: number;
      readonly missing: readonly LevineMarkerKey[];
      readonly status: 'calibrating';
    };

function usable(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

/**
 * The number itself, or null. Null is a real answer here and callers must render it as one —
 * Legacy's own guard is that `ln(1 - M)` needs `M` strictly inside `(0, 1)`, and a panel that
 * leaves that domain has no PhenoAge rather than a clamped one.
 */
export function computePhenoAge(input: PhenoAgeInput): number | null {
  const { chronologicalAge, markers } = input;
  if (!Number.isFinite(chronologicalAge) || chronologicalAge <= 0) return null;
  if (!REQUIRED_MARKERS.every((key) => usable(markers[key]))) return null;

  const xb =
    -19.907 +
    -0.0336 * (markers.albumin as number) * ALBUMIN_GL_PER_GDL +
    0.0095 * (markers.creatinine as number) * CREATININE_UMOLL_PER_MGDL +
    0.1953 * ((markers.glucose as number) / GLUCOSE_MMOLL_TO_MGDL) +
    0.0954 * Math.log((markers.crp as number) / CRP_MGL_PER_MGDL) +
    -0.012 * (markers.lymph_pct as number) +
    0.0268 * (markers.mcv as number) +
    0.3306 * (markers.rdw as number) +
    0.0019 * (markers.alp as number) +
    0.0554 * (markers.wbc as number) +
    0.0804 * chronologicalAge;

  const m = 1 - Math.exp((-1.51714 * Math.exp(xb)) / 0.0076927);
  if (!(m > 0 && m < 1)) return null;

  const phenoAge = 141.50225 + Math.log(-0.00553 * Math.log(1 - m)) / 0.09165;
  return Number.isFinite(phenoAge) ? phenoAge : null;
}

/**
 * What a partial panel can honestly say.
 *
 * Missing markers are replaced by their reference bounds in both directions, and the two results
 * bracket the answer. Below six present markers the bracket is too wide to mean anything, so it
 * reports `calibrating` and no number at all — which is the shape the screen should render, rather
 * than a figure with an apology next to it.
 */
export function computePhenoAgeRange(input: PhenoAgeInput): PhenoAgeRange {
  const present = REQUIRED_MARKERS.filter((key) => usable(input.markers[key]));
  const missing = REQUIRED_MARKERS.filter((key) => !usable(input.markers[key]));

  if (present.length < 6) {
    return { markersPresent: present.length, missing, status: 'calibrating' };
  }

  const atBound = (bound: 'max' | 'min') => {
    const filled: Partial<Record<LevineMarkerKey, number>> = { ...input.markers };
    for (const key of missing) filled[key] = REFERENCE_BOUNDS[key][bound];
    return computePhenoAge({ chronologicalAge: input.chronologicalAge, markers: filled });
  };

  const low = atBound('min');
  const high = atBound('max');
  if (low === null || high === null) {
    return { markersPresent: present.length, missing, status: 'calibrating' };
  }

  return {
    high: Math.max(low, high),
    low: Math.min(low, high),
    markersPresent: present.length,
    missing,
    point: (low + high) / 2,
    status: 'ready',
  };
}

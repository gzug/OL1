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

/**
 * Which markers are moving the number, and in which direction.
 *
 * **PORTED from Legacy `data/insights/bioAgeDrivers.ts`, and its design is the reason to take it.**
 * Legacy's note: the decomposition produces a per-marker `impact` in the model's own coefficient
 * space, "that number is model-internal and MUST NOT reach the UI face". So the type it hands out
 * carries direction and rank and nothing else, "making it structurally impossible to render a year
 * number from this path".
 *
 * **This port goes further than Legacy on purpose.** Legacy exported its `MarkerImpact` type from
 * the service, so a determined caller could import it and do the arithmetic anyway. Here the
 * contribution maths is module-private and the impact type is never exported — the numbers cannot
 * leave this file at all. Design by construction rather than by discipline: nobody has to remember
 * the rule, because there is no way to break it.
 *
 * Why it matters: "your CRP is costing you 3.2 years" is a sentence this app must never say. It is
 * a clinical claim dressed as arithmetic, from a regression fitted on a population, about one
 * person's single blood draw. Direction and order are what the data supports — this marker is
 * pushing the number up more than that one — and that is all this hands over.
 */

/**
 * Reference values for a healthy cohort, from Levine 2018 / NHANES. Legacy's own table.
 *
 * They are the baseline each marker is compared against, NOT a target and NOT a normal range. A
 * marker "pushing up" means it sits where it raises the calculation relative to this reference —
 * it does not mean the value is unhealthy, and nothing here may say that it is.
 */
const REFERENCE: Readonly<Record<LevineMarkerKey, number>> = {
  albumin: 4.5,
  alp: 70,
  creatinine: 0.9,
  crp: 1.0,
  glucose: 90,
  lymph_pct: 30,
  mcv: 88,
  rdw: 13.5,
  wbc: 6.5,
};

/**
 * One marker's contribution to `xb`, in the model's own space.
 *
 * Deliberately not exported, and neither is anything built from it. The coefficients are the same
 * ones `computePhenoAge` uses above; if one changes, both change together because they are the
 * same line of the same published formula.
 */
function contribution(key: LevineMarkerKey, value: number): number {
  switch (key) {
    case 'albumin':
      return -0.0336 * value * ALBUMIN_GL_PER_GDL;
    case 'alp':
      return 0.0019 * value;
    case 'creatinine':
      return 0.0095 * value * CREATININE_UMOLL_PER_MGDL;
    case 'crp':
      return 0.0954 * Math.log(value / CRP_MGL_PER_MGDL);
    case 'glucose':
      return 0.1953 * (value / GLUCOSE_MMOLL_TO_MGDL);
    case 'lymph_pct':
      return -0.012 * value;
    case 'mcv':
      return 0.0268 * value;
    case 'rdw':
      return 0.3306 * value;
    case 'wbc':
      return 0.0554 * value;
  }
}

/**
 * A marker that is moving the number.
 *
 * **There is no numeric field here beyond `rank`, and that is the whole point.** `rank` is a
 * position in an order — first, second — not a quantity of anything. Adding an `impact`, a
 * percentage or a number of years to this type would undo the only thing this module is for.
 */
export type BioAgeDriver = {
  readonly direction: 'down' | 'up';
  readonly key: LevineMarkerKey;
  /** 1-based within its own direction. An order, never a size. */
  readonly rank: number;
};

export type BioAgeDrivers = {
  /** Markers reading the age lower, biggest first. */
  readonly helpingDown: readonly BioAgeDriver[];
  /** Markers reading the age higher, biggest first. */
  readonly pushingUp: readonly BioAgeDriver[];
};

/**
 * The drivers, or null when the panel cannot support the calculation at all.
 *
 * Two up and one down, which is Legacy's choice and a good one: a list of nine is a wall, and the
 * two things pushing hardest plus the one helping most is what a person can hold. Degrades
 * gracefully — fewer than that is returned when fewer exist.
 */
export function bioAgeDrivers(input: PhenoAgeInput): BioAgeDrivers | null {
  const { markers } = input;
  if (!REQUIRED_MARKERS.every((key) => usable(markers[key]))) return null;

  const ranked = REQUIRED_MARKERS.map((key) => ({
    key,
    delta: contribution(key, markers[key] as number) - contribution(key, REFERENCE[key]),
  })).sort((a, b) => b.delta - a.delta);

  const pushingUp: BioAgeDriver[] = [];
  const helpingDown: BioAgeDriver[] = [];

  for (const { delta, key } of ranked) {
    if (delta > 0 && pushingUp.length < 2) {
      pushingUp.push({ direction: 'up', key, rank: pushingUp.length + 1 });
    } else if (delta < 0 && helpingDown.length < 1) {
      helpingDown.push({ direction: 'down', key, rank: helpingDown.length + 1 });
    }
    if (pushingUp.length >= 2 && helpingDown.length >= 1) break;
  }

  return { helpingDown, pushingUp };
}

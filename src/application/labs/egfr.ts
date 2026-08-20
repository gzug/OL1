/**
 * Kidney function from a panel you already have — CKD-EPI 2021.
 *
 * **The first derived metric because it needs nothing new.** The owner asked for the easiest and
 * fastest of the derived numbers, and this is unambiguously it: creatinine, age and sex are all
 * already stored. Insulin resistance needs fasting insulin, and cholesterol balance needs a lipid
 * panel — neither is collected, so both are features rather than derivations.
 *
 * Reference: Inker et al. (2021), *New Creatinine- and Cystatin C–Based Equations to Estimate GFR
 * without Race*, N Engl J Med 385:1737-1749. The equation:
 *
 * ```
 * eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^-1.200 × 0.9938^age × 1.012 [if female]
 * ```
 *
 * **The 2021 equation, deliberately, and not the 2009 one it replaced.** The older version carried
 * a race coefficient that raised the estimate for Black patients with no physiological basis, which
 * delayed referrals and transplant listings. The National Kidney Foundation and the American Society
 * of Nephrology removed it. Using the superseded equation here would import that, silently.
 *
 * Pure, and it refuses rather than guesses — the same rule `phenoAge.ts` follows.
 */

import type { Sex } from '@/core/profile';

/** Millilitres per minute per 1.73 m². The unit is part of the number and screens must show it. */
export const EGFR_UNIT = 'mL/min/1.73m²';

/**
 * The equation is fitted on adults. Below eighteen, kidney function is estimated a different way
 * entirely (the Schwartz equation), so this returns nothing rather than a wrong number.
 */
export const MIN_AGE = 18;

/**
 * **Sex is required, and `other` / `preferNotToSay` produce no number.**
 *
 * That is a real limitation stated rather than papered over. The equation has exactly two sex
 * coefficients because it was fitted that way, and picking one for somebody who declined to say
 * would be inventing a body. The two answers differ by roughly a sixth, which is far too much to
 * split the difference and call it an estimate.
 */
function coefficients(sex: Sex): { alpha: number; factor: number; kappa: number } | null {
  if (sex === 'female') return { alpha: -0.241, factor: 1.012, kappa: 0.7 };
  if (sex === 'male') return { alpha: -0.302, factor: 1, kappa: 0.9 };
  return null;
}

export type EgfrInput = {
  readonly age: number;
  /** In `mg/dL` — the unit `units.ts` converts everything to. */
  readonly creatinine: number;
  readonly sex: Sex;
};

export function estimatedGfr(input: EgfrInput): number | null {
  const { age, creatinine, sex } = input;
  const constants = coefficients(sex);

  if (constants === null) return null;
  if (!Number.isFinite(age) || age < MIN_AGE || age > 120) return null;
  if (!Number.isFinite(creatinine) || creatinine <= 0) return null;

  const ratio = creatinine / constants.kappa;
  const value =
    142 *
    Math.pow(Math.min(ratio, 1), constants.alpha) *
    Math.pow(Math.max(ratio, 1), -1.2) *
    Math.pow(0.9938, age) *
    constants.factor;

  return Number.isFinite(value) ? value : null;
}

/**
 * The KDIGO stage a value falls in.
 *
 * **A stage is not a diagnosis and this file will not let one be rendered as one.** Chronic kidney
 * disease requires a reduced eGFR sustained for at least three months, plus clinical context. One
 * blood draw is a reading. `G3a` on a single panel from a well person is frequently nothing —
 * dehydration, a heavy protein meal, or a hard training session the day before all raise creatinine
 * and push the estimate down.
 *
 * So the label is returned without a verdict attached, and the copy that renders it says what a
 * single reading can and cannot mean.
 */
export type GfrStage = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';

export function gfrStage(value: number): GfrStage {
  if (value >= 90) return 'G1';
  if (value >= 60) return 'G2';
  if (value >= 45) return 'G3a';
  if (value >= 30) return 'G3b';
  if (value >= 15) return 'G4';
  return 'G5';
}

/**
 * What the stage means, in words, with no instruction in any of them.
 *
 * `G2` is the one worth getting right: it covers 60–89, which is where an enormous number of
 * perfectly healthy adults sit, and calling it "mildly decreased" — as the clinical tables do —
 * reads as a finding to anyone who is not a nephrologist.
 */
export const STAGE_MEANING: Readonly<Record<GfrStage, string>> = {
  G1: 'In the range most healthy adults sit in.',
  G2: 'Also common in healthy adults. On its own, without other signs, this range is not considered a problem.',
  G3a: 'Below the usual range. A single reading is not a diagnosis — this is worth repeating and worth a doctor’s eyes.',
  G3b: 'Well below the usual range. Worth showing to a doctor rather than acting on here.',
  G4: 'Far below the usual range. This belongs with a doctor.',
  G5: 'Far below the usual range. This belongs with a doctor.',
};

/** The sentence that has to accompany every eGFR this app shows. */
export const EGFR_CAVEAT =
  'Estimated from one creatinine result, your age and your sex. It moves with hydration, a big protein meal, and hard training in the days before a draw — so one reading is a snapshot, not a trend.';

/**
 * Clinical unit conversion, defined exactly once.
 *
 * **PORTED from Legacy `data/health/units.ts` and `services/unitConverter.ts`.** Legacy calls this
 * part of its Clinical Safety Gate and guards it with a script that fails the build on any inlined
 * conversion factor, because a second copy of `/ 88.4` is how two screens come to disagree about
 * the same blood.
 *
 * That rule is why this file is in `application/` rather than beside the lab screen: both the
 * PhenoAge calculation and the screen someone types into need these numbers, and a UI module cannot
 * be the home of something the application layer depends on.
 *
 * **Why it matters here.** The Levine formula takes American units, and a European panel reports
 * three of the nine differently: albumin `g/L` not `g/dL` (a factor of ten), creatinine `µmol/L`
 * not `mg/dL` (88.4), glucose `mmol/L` not `mg/dL` (18). Typed raw, those produce a biological age
 * that is confidently wrong.
 *
 * **What is deliberately NOT convertible.** White cells in `cells/µL` differ from `10³/µL` by a
 * factor of a thousand. That conversion is absent, so it is refused rather than guessed — a silent
 * mis-scale by 1000 is far worse than a value the screen declines to accept. Legacy makes the same
 * refusal; it is carried because it is a decision rather than an omission.
 */

export type LevineMarkerKey =
  | 'albumin'
  | 'alp'
  | 'creatinine'
  | 'crp'
  | 'glucose'
  | 'lymph_pct'
  | 'mcv'
  | 'rdw'
  | 'wbc';

/** Defined once, and nowhere else in the repository. */
export const ALBUMIN_GL_PER_GDL = 10;
export const CREATININE_UMOLL_PER_MGDL = 88.4;
export const CRP_MGL_PER_MGDL = 10;
export const GLUCOSE_MMOLL_TO_MGDL = 18.0182;

/** The unit each marker must be in before the formula reads it. */
export const TARGET_UNIT: Readonly<Record<LevineMarkerKey, string>> = {
  albumin: 'g/dL',
  alp: 'U/L',
  creatinine: 'mg/dL',
  crp: 'mg/L',
  glucose: 'mg/dL',
  lymph_pct: '%',
  mcv: 'fL',
  rdw: '%',
  wbc: '10³/µL',
};

/** The other unit a laboratory is likely to have used, where there is one. */
export const ALTERNATE_UNIT: Readonly<Partial<Record<LevineMarkerKey, string>>> = {
  albumin: 'g/L',
  creatinine: 'µmol/L',
  crp: 'mg/dL',
  glucose: 'mmol/L',
  wbc: '10⁹/L',
};

/**
 * Fold a unit string so real-world spellings match.
 *
 * Legacy's note: a European panel typed with `µ`, or one read by OCR, would otherwise fail to
 * convert and read as missing. Superscripts are folded for the same reason.
 */
export function normUnit(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .replace(/µ/g, 'u')
    .replace(/³/g, '3')
    .replace(/⁹/g, '9')
    .replace(/\s+/g, '');
}

/**
 * A value expressed in the unit the formula takes, or null when this is not a conversion it knows.
 *
 * Null is a refusal rather than a failure. See the note on `cells/µL` at the top of this file.
 */
export function toTargetUnit(
  key: LevineMarkerKey,
  value: number,
  fromUnit: string,
): number | null {
  const target = normUnit(TARGET_UNIT[key]);
  const source = normUnit(fromUnit);

  if (source === target) return value;

  if (key === 'albumin' && source === 'g/l') return value / ALBUMIN_GL_PER_GDL;
  if (key === 'creatinine' && source === 'umol/l') return value / CREATININE_UMOLL_PER_MGDL;
  if (key === 'crp' && source === 'mg/dl') return value * CRP_MGL_PER_MGDL;
  if (key === 'glucose' && source === 'mmol/l') return value * GLUCOSE_MMOLL_TO_MGDL;

  // Numerically identical to the target, so the number passes through unchanged.
  if (key === 'wbc' && ['109/l', '10^9/l', 'g/l', '103/ul', '10^3/ul', 'k/ul'].includes(source)) {
    return value;
  }

  return null;
}

/** A sane range restated in whichever unit is being typed, so the screen can say it correctly. */
export function boundsIn(
  key: LevineMarkerKey,
  sane: { max: number; min: number },
  unit: string,
): { max: number; min: number } | null {
  if (normUnit(unit) === normUnit(TARGET_UNIT[key])) return sane;

  const perUnit = toTargetUnit(key, 1, unit);
  if (perUnit === null || perUnit === 0) return null;

  const ends = [sane.min / perUnit, sane.max / perUnit].sort((a, b) => a - b);
  const tidy = (value: number) => Math.round(value * 100) / 100;
  return { max: tidy(ends[1] as number), min: tidy(ends[0] as number) };
}

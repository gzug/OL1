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

/**
 * Markers a panel can hold beyond the nine the formula reads.
 *
 * Kept as its own union so nothing can pass one where a `LevineMarkerKey` is expected — a lipid
 * reaching `computePhenoAge` is the failure this separation exists to prevent.
 */
export type ExtraUnitKey =
  | 'apob'
  | 'hba1c'
  | 'hdl'
  | 'ldl'
  | 'lpa'
  | 'total_cholesterol'
  | 'triglycerides'
  | 'vitamin_d';

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

/**
 * Cholesterol and triglycerides, `mmol/L` to `mg/dL`.
 *
 * **Two different factors, and they are not interchangeable.** Cholesterol species — total, LDL,
 * HDL — divide by 38.67; triglycerides divide by 88.57, because a triglyceride molecule is far
 * heavier. Using one factor for all four is the single most common mistake in converting a lipid
 * panel, and it puts triglycerides out by more than a factor of two.
 *
 * Everywhere outside the United States prints `mmol/L`, so this is the ordinary case rather than
 * the exotic one — the owner's own panel is Australian.
 */
export const CHOLESTEROL_MMOLL_TO_MGDL = 38.67;
export const TRIGLYCERIDES_MMOLL_TO_MGDL = 88.57;

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

/**
 * The order a panel prints these in, which is the order every screen must show them in.
 *
 * **Not alphabetical, and not the object's key order.** `EXTRA_TARGET_UNIT` is written
 * alphabetically because a lookup table should be scannable, and reading the order off it put ApoB
 * at the top of "what changed" while the Labs block led with total cholesterol — the same markers
 * in two orders on one screen, which reads as two different lists.
 *
 * A lipid panel is printed total, LDL, HDL, triglycerides. Anything else follows.
 */
export const EXTRA_MARKER_ORDER: readonly ExtraUnitKey[] = [
  'total_cholesterol',
  'ldl',
  'hdl',
  'triglycerides',
  'apob',
  'lpa',
  'hba1c',
  'vitamin_d',
];

/** What each extra marker is stored in, and what a laboratory elsewhere is likely to have printed. */
export const EXTRA_TARGET_UNIT: Readonly<Record<ExtraUnitKey, string>> = {
  apob: 'mg/dL',
  hba1c: '%',
  hdl: 'mg/dL',
  ldl: 'mg/dL',
  lpa: 'nmol/L',
  total_cholesterol: 'mg/dL',
  triglycerides: 'mg/dL',
  vitamin_d: 'ng/mL',
};

export const EXTRA_ALTERNATE_UNIT: Readonly<Partial<Record<ExtraUnitKey, string>>> = {
  apob: 'g/L',
  hdl: 'mmol/L',
  ldl: 'mmol/L',
  lpa: 'mg/dL',
  total_cholesterol: 'mmol/L',
  triglycerides: 'mmol/L',
  vitamin_d: 'nmol/L',
};

/**
 * An extra marker in the unit it is stored in, or null when this is not a conversion it knows.
 *
 * **`mmol/L` for Lp(a) is deliberately absent.** Lp(a) is reported in `nmol/L` or `mg/dL`, and the
 * factor between them depends on the particle's size, which differs between people — there is no
 * single correct number. Laboratories say so themselves. Refusing is the only honest answer, and it
 * is the same refusal `cells/µL` gets above.
 */
export function extraToTargetUnit(
  key: ExtraUnitKey,
  value: number,
  fromUnit: string,
): number | null {
  const target = normUnit(EXTRA_TARGET_UNIT[key]);
  const source = normUnit(fromUnit);

  if (source === target) return value;

  // Cholesterol species and triglycerides use DIFFERENT factors. See the note on the constants.
  if (source === 'mmol/l') {
    if (key === 'hdl' || key === 'ldl' || key === 'total_cholesterol') {
      return value * CHOLESTEROL_MMOLL_TO_MGDL;
    }
    if (key === 'triglycerides') return value * TRIGLYCERIDES_MMOLL_TO_MGDL;
  }

  // ApoB is printed either way; 1 g/L is 100 mg/dL, which is exact rather than a conversion factor.
  if (key === 'apob' && source === 'g/l') return value * 100;

  // Vitamin D: 1 ng/mL is 2.496 nmol/L, and this direction is a division.
  if (key === 'vitamin_d' && source === 'nmol/l') return value / 2.496;

  return null;
}

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
 *
 * The leading `x` goes the same way. An Australian report prints white cells as `x10 ^9 /L`, and
 * that `x` is a multiplication sign rather than part of the unit — left in, it fails to match
 * `10⁹/L`, and a marker the parser read perfectly well arrives with no usable value.
 */
export function normUnit(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .replace(/µ/g, 'u')
    .replace(/³/g, '3')
    .replace(/⁹/g, '9')
    .replace(/\s+/g, '')
    .replace(/^[x×*]/, '');
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

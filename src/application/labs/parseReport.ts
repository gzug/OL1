/**
 * Finding the nine markers in the text of a lab report.
 *
 * **PORTED from Legacy `services/localLabHeuristics.ts`**, whose marker vocabulary is the valuable
 * part and covers both languages: Kreatinin and Creatinine, Glukose and Glucose, Alkalische
 * Phosphatase and ALP, C-reaktives Protein and CRP, Leukozyten and WBC, EVB and RDW.
 *
 * **Where this goes past Legacy: it reads the unit rather than assuming one.** Legacy's own comment
 * admits the gap — *"we don't confidently extract units via naive regex yet. Users will confirm
 * units in the review screen."* That assumption is the single most dangerous one available here. A
 * German panel reports albumin in `g/L`; defaulting it to `g/dL` makes a perfectly ordinary result
 * read as ten times too high, and the biological age built on it is confidently wrong rather than
 * obviously wrong.
 *
 * So a unit found beside the value wins, a missing unit is reported as missing, and nothing here
 * guesses. `application/labs/units.ts` does the converting; this only reads.
 *
 * **Pure.** No OCR, no model, no file handling — text in, findings out. That is deliberate: the
 * same parser serves whichever way the text arrives (a vision model, on-device OCR, or the text
 * layer of a PDF), and it can be asserted against real report layouts in bare Node.
 */

import {
  EXTRA_TARGET_UNIT,
  TARGET_UNIT,
  extraToTargetUnit,
  normUnit,
  toTargetUnit,
  type ExtraUnitKey,
  type LevineMarkerKey,
} from './units';

/**
 * Every marker this can find: the nine the formula reads, and the ones it does not.
 *
 * **They are one union HERE and two unions everywhere else, deliberately.** A parser reads whatever
 * a report prints; the calculation reads exactly nine. Widening this type is what lets a lipid be
 * found, and keeping `LevineMarkerKey` narrow is what stops one reaching `computePhenoAge`.
 */
export type ReadableMarkerKey = ExtraUnitKey | LevineMarkerKey;

/** Whether a key is one of the nine, which decides which conversion table applies to it. */
function isLevine(key: ReadableMarkerKey): key is LevineMarkerKey {
  return Object.prototype.hasOwnProperty.call(TARGET_UNIT, key);
}

type Rule = {
  readonly key: ReadableMarkerKey;
  /** Group 1 is the value. Group 2, when present, is the unit printed beside it. */
  readonly pattern: RegExp;
};

/**
 * Every unit spelling a report might carry for these markers, as one alternation.
 *
 * Kept in one place rather than repeated per rule, and deliberately generous — a unit this does not
 * recognise is better reported as absent than mistaken for a different one.
 */
const UNIT = String.raw`(?:g\s*\/\s*[dD]?[lL]|mg\s*\/\s*[dD]?[lL]|ng\s*\/\s*m?[lL]|[µun]mol\s*\/\s*[lL]|mmol\s*\/\s*[lL]|[UIui]\s*\/\s*[lL]|fl|fL|%|[xX]?\s*10\s*[\^]?\s*[39]\s*\/\s*[µu]?[lL]|[GKgk]\s*\/\s*[lL])`;

const VALUE = String.raw`(\d+(?:[.,]\d+)?)`;

/**
 * Between the name and the number: colons, equals, whitespace, the vertical bars tables leave, and
 * the full stop an abbreviation ends on — a real report writes `Alk. Phos. 80`, and without the dot
 * here that marker is silently absent rather than wrong, which is the harder failure to notice.
 *
 * **`<` and `>` are deliberately not in this set.** A laboratory prints `CRP <3 mg/L` when the true
 * value is below what the assay can see, and admitting the `<` here would read that as the number
 * three — turning “we could not measure it” into a measurement. Leaving them out makes a censored
 * result fail to match, which is the correct outcome: it is not a value.
 *
 * The leading group is the qualifier a laboratory puts after a marker's name — `Glucose (Fasting)`,
 * `Creatinine (serum)`. It is bounded and cannot cross a line, so it admits the bracket a report
 * actually prints without letting a marker name reach a number belonging to some other row.
 */
const GAP = String.raw`(?:\s*\([^)\n]{0,24}\))?[\s:=|.]*`;

function rule(names: string, key: ReadableMarkerKey): Rule {
  return {
    key,
    pattern: new RegExp(`(?:${names})${GAP}${VALUE}\\s*(${UNIT})?`, 'i'),
  };
}

/**
 * Legacy's vocabulary, plus the spellings its list missed.
 *
 * Legacy's list was built from German reports, and it abbreviates. Run against a real Australian
 * panel it found four of the nine markers, missed four that the laboratory had written out in full,
 * and got one actively wrong. Every addition below is one of those five.
 *
 * `Albumin` must not match `Mikroalbumin` — a urine marker on the same report with a value three
 * orders of magnitude different — so it is anchored to a word boundary that a prefix breaks.
 */
const RULES: readonly Rule[] = [
  /**
   * **`Adjusted for Albumin` is a calcium result, not an albumin result.** It is calcium corrected
   * for albumin, it prints in mmol/L, and on the panel that exposed this it sat two lines above the
   * real albumin row — so the parser matched it first and read albumin as 2.32 where the truth was
   * 44. A twentyfold error, in the single input the Levine formula is most sensitive to, arriving as
   * a plausible number rather than as a failure. The `for` is what disqualifies it.
   */
  rule(String.raw`(?<!for\s)(?<![a-zä])Albumin|\bALB\b`, 'albumin'),
  rule(String.raw`Kreatinin|Creatinine|\bCrea\b|\bCRE\b`, 'creatinine'),
  rule(String.raw`Glukose|Glucose|\bGluc\b|\bGLU\b|\bBZ\b|Blutzucker`, 'glucose'),
  rule(String.raw`hs-?CRP|\bCRP\b|C-reaktives Protein|C-reactive Protein`, 'crp'),
  rule(String.raw`Lymphozyten(?:\s*rel\.?)?|Lymphocytes|\bLymph\b|\bLYM\b`, 'lymph_pct'),
  rule(String.raw`\bMCV\b|Mean (?:Cell|Corpuscular) Volume|Mittleres Zellvolumen`, 'mcv'),
  rule(
    String.raw`\bRDW\b|\bEVB\b|Red Cell Dist(?:ribution)?\w*\.?\s*Width|Erythrozytenverteilungsbreite`,
    'rdw',
  ),
  rule(String.raw`Alkalische Phosphatase|Alk\.?\s*Phos\w*|\bALP\b|\bAP\b`, 'alp'),
  rule(
    String.raw`Leukozyten|Leukocytes|White (?:Blood )?Cell Count|\bLeukos\b|\bWBC\b|\bLEU\b`,
    'wbc',
  ),

  /**
   * The markers the age calculation does NOT read, added 2026-08-21.
   *
   * A panel arrives with a lipid profile on it and the app used to read straight past it. These are
   * recorded and shown; `computePhenoAgeRange` reads exactly nine keys and would ignore them —
   * which is the point, and why they are a separate union in `units.ts`.
   *
   * **`LDL` must not match `LDL/HDL Ratio`**, and `HDL` must not match it either. A ratio line sits
   * directly beneath the two values it is built from on almost every printed panel, and matched as
   * a value it reads as a cholesterol of three. That is the `Adjusted for Albumin` shape again, and
   * it was found the same way — by looking at a real report.
   */
  rule(String.raw`Gesamtcholesterin|Total Cholesterol|Cholesterol,? Total|\bTC\b`, 'total_cholesterol'),
  rule(String.raw`LDL[- ]?Cholesterin|LDL[- ]?Cholesterol|\bLDL\b(?!\s*[/:])`, 'ldl'),
  rule(String.raw`HDL[- ]?Cholesterin|HDL[- ]?Cholesterol|\bHDL\b(?!\s*[/:])`, 'hdl'),
  rule(String.raw`Triglyzeride|Triglyceride[sn]?|\bTG\b`, 'triglycerides'),
  rule(String.raw`Apolipoprotein B|\bApo\s?B\b|\bApoB\b`, 'apob'),
  rule(String.raw`Lipoprotein\s?\(a\)|\bLp\s?\(a\)\b`, 'lpa'),
  rule(String.raw`\bHbA1c\b|Hämoglobin A1c|Haemoglobin A1c|Glycated Haemoglobin`, 'hba1c'),
  rule(String.raw`Vitamin\s?D|25-?OH[- ]?Vitamin\s?D|25[- ]?Hydroxyvitamin\s?D`, 'vitamin_d'),
];

export type Finding = {
  /** The value as printed, before any conversion. */
  readonly asPrinted: number;
  /** In the unit the formula reads, or null when the unit was missing or unrecognised. */
  readonly converted: number | null;
  readonly key: ReadableMarkerKey;
  /** What was matched, so a person reviewing can see where it came from. */
  readonly matched: string;
  /** The unit found beside the value, or null. **Never guessed.** */
  readonly unit: string | null;
};

export type ParsedReport = {
  readonly findings: readonly Finding[];
  /**
   * **Only the nine the formula reads.** A lipid the report did not carry is not missing — most
   * panels do not include one, and listing every marker this can recognise as absent would turn a
   * complete blood count into a list of things somebody failed to have.
   */
  readonly missing: readonly LevineMarkerKey[];
};

export function parseReport(text: string): ParsedReport {
  // Reports arrive as blocks; a marker and its value are often split across lines.
  const flat = text.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ');

  const findings: Finding[] = [];
  const missing: LevineMarkerKey[] = [];

  for (const { key, pattern } of RULES) {
    const match = pattern.exec(flat);
    if (match === null || match[1] === undefined) {
      if (isLevine(key)) missing.push(key);
      continue;
    }

    // A German report writes 4,5 where an English one writes 4.5.
    const asPrinted = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(asPrinted)) {
      if (isLevine(key)) missing.push(key);
      continue;
    }

    const unit = match[2] === undefined ? null : match[2].replace(/\s+/g, '');

    findings.push({
      asPrinted,
      /* No unit means no conversion. Assuming the formula's unit is exactly the mistake Legacy's
         `defaultUnit` made, and it is invisible: the number looks reasonable and is out by ten.
         The two tables are separate because the keys are — see `ReadableMarkerKey`. */
      converted:
        unit === null
          ? null
          : isLevine(key)
            ? toTargetUnit(key, asPrinted, unit)
            : extraToTargetUnit(key, asPrinted, unit),
      key,
      matched: match[0].trim(),
      unit,
    });
  }

  return { findings, missing };
}

/** Whether a finding can be filled in without somebody choosing a unit first. */
export function isUsable(finding: Finding): boolean {
  return finding.converted !== null;
}

/** What the review screen says about a finding whose unit it could not read. */
export function unitQuestion(finding: Finding): string {
  return finding.unit === null
    ? `No unit was printed next to ${finding.asPrinted}. Pick the one your report uses.`
    : `"${finding.unit}" is not a unit this recognises for ${finding.key.replace('_', ' ')}. Pick one.`;
}

/** The unit a marker is stored in, for a screen that has to offer it as a choice. */
export function formulaUnit(key: ReadableMarkerKey): string {
  return isLevine(key) ? TARGET_UNIT[key] : EXTRA_TARGET_UNIT[key];
}

/** Exported for the test that proves the vocabulary matches what a real report prints. */
export const RECOGNISED_UNIT = new RegExp(`^${UNIT}$`, 'i');

export { normUnit };

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

import { TARGET_UNIT, normUnit, toTargetUnit, type LevineMarkerKey } from './units';

type Rule = {
  readonly key: LevineMarkerKey;
  /** Group 1 is the value. Group 2, when present, is the unit printed beside it. */
  readonly pattern: RegExp;
};

/**
 * Every unit spelling a report might carry for these markers, as one alternation.
 *
 * Kept in one place rather than repeated per rule, and deliberately generous — a unit this does not
 * recognise is better reported as absent than mistaken for a different one.
 */
const UNIT = String.raw`(?:g\s*\/\s*[dD]?[lL]|mg\s*\/\s*[dD]?[lL]|[µu]mol\s*\/\s*[lL]|mmol\s*\/\s*[lL]|[UIui]\s*\/\s*[lL]|fl|fL|%|[xX]?\s*10\s*[\^]?\s*[39]\s*\/\s*[µu]?[lL]|[GKgk]\s*\/\s*[lL])`;

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

function rule(names: string, key: LevineMarkerKey): Rule {
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
];

export type Finding = {
  /** The value as printed, before any conversion. */
  readonly asPrinted: number;
  /** In the unit the formula reads, or null when the unit was missing or unrecognised. */
  readonly converted: number | null;
  readonly key: LevineMarkerKey;
  /** What was matched, so a person reviewing can see where it came from. */
  readonly matched: string;
  /** The unit found beside the value, or null. **Never guessed.** */
  readonly unit: string | null;
};

export type ParsedReport = {
  readonly findings: readonly Finding[];
  /** Markers this could not find at all. Named, so the screen can say which rather than show blanks. */
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
      missing.push(key);
      continue;
    }

    // A German report writes 4,5 where an English one writes 4.5.
    const asPrinted = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(asPrinted)) {
      missing.push(key);
      continue;
    }

    const unit = match[2] === undefined ? null : match[2].replace(/\s+/g, '');

    findings.push({
      asPrinted,
      /* No unit means no conversion. Assuming the formula's unit is exactly the mistake Legacy's
         `defaultUnit` made, and it is invisible: the number looks reasonable and is out by ten. */
      converted: unit === null ? null : toTargetUnit(key, asPrinted, unit),
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

/** The unit the formula reads, for a screen that has to offer it as a choice. */
export function formulaUnit(key: LevineMarkerKey): string {
  return TARGET_UNIT[key];
}

/** Exported for the test that proves the vocabulary matches what a real report prints. */
export const RECOGNISED_UNIT = new RegExp(`^${UNIT}$`, 'i');

export { normUnit };

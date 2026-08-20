import assert from 'node:assert/strict';
import test from 'node:test';

import { isUsable, parseReport } from '../src/application/labs/parseReport';

/**
 * Fixtures are INVENTED layouts in the shape a report takes, with values chosen to be ordinary.
 * No real panel is in this repository and none may be — see `scripts/check-sensitive-content.ts`.
 */

/** A German laboratory, the layout this most needs to handle. Values in European units. */
const GERMAN = `
Klinische Chemie
Albumin              45,2 g/L
Kreatinin            0,92 mg/dL
Glukose              5,1 mmol/L
C-reaktives Protein  1,8 mg/L
Alkalische Phosphatase  71 U/L

Hämatologie
Leukozyten           6,4 10^9/L
MCV                  88,5 fL
EVB (RDW)            13,1 %
Lymphozyten rel.     31,2 %
`;

/** An American laboratory, everything already in the formula's units. */
const AMERICAN = `
CHEMISTRY
Albumin           4.5 g/dL
Creatinine        0.90 mg/dL
Glucose           92 mg/dL
CRP               1.2 mg/L
ALP               70 U/L

CBC
WBC               6.5 10^3/uL
MCV               88 fL
RDW               13.5 %
Lymphocytes       30 %
`;

/**
 * An Australian laboratory, which writes every marker out in full instead of abbreviating and
 * prints a calcium result on the way past.
 *
 * **This layout is here because the parser failed five ways on one like it**, and every one of the
 * five was invisible to the two fixtures above:
 *
 * - `Adjusted for Albumin` is CALCIUM corrected for albumin, in mmol/L. Matched as albumin it gave
 *   2.32 where the truth was 44 — a twentyfold error in the input the formula is most sensitive to,
 *   arriving as a plausible number rather than as a failure. This is the one that mattered.
 * - `Mean Cell Volume`, `Red Cell Dist. Width` and `White Cell Count` were simply absent from a
 *   vocabulary built out of German abbreviations.
 * - `Alk. Phos.` ends on a full stop, which the gap between a name and its number did not admit.
 *
 * Values below are INVENTED like every other fixture here, but the wording, the column order and
 * the `x10 ^9 /L` spacing are what a real report does.
 */
const AUSTRALIAN = `
BIOCHEMISTRY                Result   Units       Reference
Sodium                      140      mmol/L      135 - 145
Calcium                     2.41     mmol/L      2.10 - 2.60
  Adjusted for Albumin      2.35     mmol/L      2.10 - 2.60
Total Protein               73       g/L         60 - 80
Albumin                     46       g/L         35 - 50
Creatinine                  94       umol/L      60 - 110
Glucose (Fasting)           5.1      mmol/L      3.0 - 5.4
Alk. Phos.                  74       U/L         30 - 110
hs-CRP                      0.8      mg/L        < 5.0

HAEMATOLOGY
White Cell Count            6.2      x10 ^9 /L   4.0 - 11.0
Mean Cell Volume            89       fL          80 - 98
Red Cell Dist. Width        13.2     %           11.5 - 14.5
Lymphocytes                 32       %           20 - 40
`;

test('an Australian report is read, where the markers are written out in full', () => {
  const { findings, missing } = parseReport(AUSTRALIAN);

  assert.deepEqual(missing, [], `did not find: ${missing.join(', ')}`);
  const find = (key: string) => findings.find((item) => item.key === key);

  assert.equal(find('mcv')?.asPrinted, 89, 'Mean Cell Volume');
  assert.equal(find('rdw')?.asPrinted, 13.2, 'Red Cell Dist. Width');
  assert.equal(find('wbc')?.asPrinted, 6.2, 'White Cell Count');
  assert.equal(find('alp')?.asPrinted, 74, 'Alk. Phos. — the trailing full stop');
  assert.equal(find('glucose')?.asPrinted, 5.1, 'Glucose (Fasting) — the bracketed qualifier');

  // `x10 ^9 /L` is numerically the formula's own unit; the `x` in front is the thing that hides it.
  assert.equal(find('wbc')?.converted, 6.2, 'the multiplication sign must not block the conversion');
});

/**
 * The regression that justifies the whole fixture. `Adjusted for Albumin` sits two lines above the
 * real albumin row and would be matched first by any pattern that only guards its left edge against
 * a prefix. 2.35 instead of 46 is not a near miss.
 */
test('a calcium result adjusted for albumin is not read as albumin', () => {
  const albumin = parseReport(AUSTRALIAN).findings.find((item) => item.key === 'albumin');

  assert.equal(albumin?.asPrinted, 46);
  assert.equal(albumin?.unit, 'g/L');
  assert.equal(albumin?.converted, 4.6, 'converted to the g/dL the formula reads');
});

/**
 * A laboratory prints `< 5.0` when the true value is under what the assay can see. Reading that as
 * five turns “we could not measure it” into a measurement, so a censored row must not match at all.
 * The Australian fixture's own hs-CRP row is the positive case: `0.8` is a real number and is read,
 * while the `< 5.0` in its reference column is not mistaken for one.
 */
test('a value the laboratory could not measure is not read as a number', () => {
  const censored = parseReport(`
Albumin      < 20 g/L
Creatinine   0.9 mg/dL
`);

  assert.ok(
    !censored.findings.some((item) => item.key === 'albumin'),
    'a censored albumin must be missing, never 20',
  );
  assert.ok(censored.missing.includes('albumin'));
});

test('a German report is read, in German, with commas for decimals', () => {
  const { findings, missing } = parseReport(GERMAN);

  assert.deepEqual(missing, [], `did not find: ${missing.join(', ')}`);
  const find = (key: string) => findings.find((item) => item.key === key);

  assert.equal(find('albumin')?.asPrinted, 45.2);
  assert.equal(find('creatinine')?.asPrinted, 0.92);
  assert.equal(find('glucose')?.asPrinted, 5.1);
  assert.equal(find('rdw')?.asPrinted, 13.1);
});

/**
 * THE POINT OF THIS FILE. Legacy assumed a default unit and said so in a comment. A German panel's
 * albumin of 45 g/L defaulted to g/dL is ten times too high, and the biological age built on it is
 * confidently wrong rather than obviously wrong.
 */
test('the unit beside the value is read, never assumed', () => {
  const { findings } = parseReport(GERMAN);
  const albumin = findings.find((item) => item.key === 'albumin');

  assert.equal(albumin?.unit, 'g/L');
  assert.equal(albumin?.converted, 4.52, '45.2 g/L is 4.52 g/dL');

  const glucose = findings.find((item) => item.key === 'glucose');
  assert.equal(glucose?.unit, 'mmol/L');
  assert.ok(Math.abs((glucose?.converted ?? 0) - 91.9) < 0.1, '5.1 mmol/L is about 92 mg/dL');
});

test('an American report needs no conversion and gets none', () => {
  const { findings, missing } = parseReport(AMERICAN);

  assert.deepEqual(missing, []);
  const albumin = findings.find((item) => item.key === 'albumin');
  assert.equal(albumin?.asPrinted, 4.5);
  assert.equal(albumin?.converted, 4.5);
});

/**
 * A value with no unit beside it is reported as having none. It is NOT filled in with the formula's
 * unit, which is exactly the assumption that makes a wrong number look reasonable.
 */
test('a value with no unit is unusable rather than assumed correct', () => {
  const { findings } = parseReport('Albumin 45,2\nKreatinin 0,92 mg/dL');
  const albumin = findings.find((item) => item.key === 'albumin');

  assert.equal(albumin?.asPrinted, 45.2);
  assert.equal(albumin?.unit, null);
  assert.equal(albumin?.converted, null);
  assert.equal(isUsable(albumin!), false, 'a unitless value was treated as ready to store');
});

/**
 * `Mikroalbumin` is a urine marker that appears on the same report with a value three orders of
 * magnitude away. Matching it as albumin would be a spectacular and silent error.
 */
test('Mikroalbumin is not albumin', () => {
  const { findings } = parseReport('Mikroalbumin im Urin 12,4 mg/L\nAlbumin 45,0 g/L');
  const albumin = findings.find((item) => item.key === 'albumin');

  assert.equal(albumin?.asPrinted, 45, 'the urine marker was read as serum albumin');
});

test('markers that are not on the report are named, not left blank', () => {
  const { findings, missing } = parseReport('Albumin 4.5 g/dL');

  assert.equal(findings.length, 1);
  assert.ok(missing.includes('creatinine'));
  assert.ok(missing.includes('wbc'));
  assert.equal(missing.length, 8);
});

test('a marker split across lines by a table layout is still found', () => {
  const { findings } = parseReport('Alkalische\nPhosphatase\n71 U/L');
  assert.equal(findings.find((item) => item.key === 'alp')?.asPrinted, 71);
});

test('nothing in an empty or unrelated document is invented', () => {
  const { findings, missing } = parseReport('This is a letter about an appointment.');
  assert.deepEqual(findings, []);
  assert.equal(missing.length, 9);
});

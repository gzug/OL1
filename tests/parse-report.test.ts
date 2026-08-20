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

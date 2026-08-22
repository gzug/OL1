import assert from 'node:assert/strict';
import test from 'node:test';

import { LIPID_READING_CAVEAT, lipidReadings } from '../src/application/labs/lipidReadings';

/**
 * Arithmetic yes, a proxy no — `docs/decisions/0018`.
 *
 * Every value here is INVENTED. What is under test is the line: these are subtraction and division
 * on numbers a person already has, with no cohort, coefficient or cutoff behind them.
 */

const PANEL = { hdl: 55, ldl: 120, total_cholesterol: 195, triglycerides: 150 };

test('non-HDL is the subtraction, and the ratio is the division', () => {
  const readings = lipidReadings(PANEL);

  assert.equal(readings.find((reading) => reading.key === 'non_hdl')?.value, 140);
  assert.equal(readings.find((reading) => reading.key === 'tc_hdl_ratio')?.value, 3.55);
});

/**
 * A panel missing either half produces NEITHER reading, rather than one of them from a substituted
 * value. The same refusal every calculation in this folder makes.
 */
test('a panel without both halves produces nothing at all', () => {
  assert.deepEqual(lipidReadings({ total_cholesterol: 195 }), []);
  assert.deepEqual(lipidReadings({ hdl: 55 }), []);
  assert.deepEqual(lipidReadings({}), []);
  assert.deepEqual(lipidReadings({ hdl: 0, total_cholesterol: 195 }), [], 'a zero is not a reading');
  assert.deepEqual(lipidReadings({ hdl: '55', total_cholesterol: 195 }), [], 'a string is not one either');
});

/**
 * **The refusal `0018` exists for.**
 *
 * The triglyceride-to-HDL ratio is one division away from the data here and must not be computed:
 * it fails outright in African-American women, has no accepted cutoffs, and is ethnicity- and
 * sex-dependent — and OL1 does not collect ethnicity, so it could not know whether the number
 * applied to the person reading it.
 */
test('nothing here computes a triglyceride ratio, however available the numbers are', () => {
  const keys = lipidReadings(PANEL).map((reading) => reading.key);

  assert.ok(!keys.some((key) => key.includes('trig')), 'a proxy arrived wearing a division sign');
  assert.ok(!keys.some((key) => /insulin|homa|resist/i.test(key)));
  assert.deepEqual([...keys].sort(), ['non_hdl', 'tc_hdl_ratio']);
});

/** No value is called good or bad, and no range is applied. The report carries its own. */
test('no reading judges the number it reports', () => {
  const judges = [
    /(?<!-)\b(?:high|low|normal|healthy|good|bad|optimal|elevated)\b(?!-)/i,
    /\brisk\b/i,
    /\byou (?:have|should|need)\b/i,
  ];

  for (const reading of lipidReadings(PANEL)) {
    for (const judge of judges) {
      assert.ok(!judge.test(reading.what), `${reading.key} judges: "${reading.what}"`);
    }
  }
  for (const judge of judges) {
    assert.ok(!judge.test(LIPID_READING_CAVEAT), LIPID_READING_CAVEAT);
  }
});

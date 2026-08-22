import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VALUE_FORMATS,
  formatDelta,
  formatDuration,
  formatDurationLong,
  formatMeasured,
  formatValue,
} from '../src/application/format/metric';

/**
 * PORTED WITH ITS BUGS — Legacy `data/metricFormat.ts` exists because of three real defects on a
 * live screen, and each one has a test here so the port cannot quietly reintroduce them.
 */

/** Defect one: a night of sleep printed as `417.4`. A number with no unit is a riddle, not a fact. */
test('a duration is written as a duration, never as a bare decimal', () => {
  assert.equal(formatValue('sleep', 417.4), '6h 57m');
  assert.equal(formatDuration(421), '7h 1m');
  assert.equal(formatDuration(48), '48m');
});

/**
 * Defect two: three private formatters rounded hours and minutes independently, so 419.7 printed as
 * "6 h 60 min" on a shipped surface. Rounding the TOTAL before splitting is the fix.
 */
test('419.7 minutes is 7 hours, not "6 h 60 min"', () => {
  assert.equal(formatDurationLong(419.7), '7 h');
  assert.equal(formatDuration(419.7), '7h 0m');
});

test('prose and dashboard forms are both defined, and differ on purpose', () => {
  assert.equal(formatDuration(452), '7h 32m');
  assert.equal(formatDurationLong(452), '7 h 32 min');
  assert.equal(formatDurationLong(60), '1 h');
  assert.equal(formatDurationLong(45), '45 min');
});

/** There is no such thing as a night of minus twenty minutes. */
test('a negative duration is clamped rather than printed', () => {
  assert.equal(formatDuration(-80), '0m');
  assert.equal(formatDurationLong(-80), '0 min');
});

/**
 * The absence law, in the one place it is cheapest to enforce: a caller must decide what absence
 * looks like rather than the formatter printing "NaN" or quietly showing a zero.
 */
test('no number produces no string, never a zero and never NaN', () => {
  assert.equal(formatValue('distance', Number.NaN), null);
  assert.equal(formatValue('calories', Number.POSITIVE_INFINITY), null);
  assert.equal(formatDelta('sleep', Number.NaN), null);
  assert.equal(formatDuration(Number.NaN), '');
});

/**
 * Legacy's split, kept: a duration VALUE reads "7h 1m" because that is how a night is spoken; a
 * duration DIFFERENCE reads "22 min", because "22m more than last week" invites the eye to read a
 * lone m as metres.
 */
test('a difference is written as a size, not as a clock reading', () => {
  assert.equal(formatDelta('sleep', 22), '+22 min');
  assert.equal(formatDelta('sleep', -22), '−22 min');
  assert.equal(formatValue('sleep', 22), '22m');
  assert.equal(formatDelta('distance', 1.4), '+1.4 km');
  assert.equal(formatDelta('calories', 0), '0 kcal');
});

/**
 * One decimal where it carries meaning, none where it does not. 8.2 km is a run and "8 km" throws
 * away something the person measured; 412.6 kcal is false precision on an estimate nobody weighed.
 */
test('precision follows the size of the number, not the metric', () => {
  assert.equal(formatValue('distance', 8.2), '8.2 km');
  assert.equal(formatValue('distance', 8), '8 km');
  assert.equal(formatValue('calories', 412.6), '413 kcal');
  assert.equal(formatValue('weight', 81.45), '81.5 kg');
  assert.equal(formatValue('sessions', 5), '5');
});

test('every metric this app can write down has a format', () => {
  for (const [key, format] of Object.entries(VALUE_FORMATS)) {
    assert.ok(format.kind !== undefined, `"${key}" has no format`);
    if (format.kind === 'unit') {
      assert.ok(format.unit.length > 0, `"${key}" has an empty unit, which prints a trailing space`);
    }
  }
});

/**
 * **Defect four, and the reason `formatMeasured` exists.**
 *
 * A marker is STORED in the unit the formula reads, converted once at the edge — `levine.ts` says
 * so and is right to. What nobody carried through was that a conversion does not land on a round
 * figure, and four screens interpolated the stored number straight into a `<Text>`.
 *
 * Every input below is INVENTED — an ordinary European figure put through the conversion in
 * `units.ts`, `71 / 88.4` and `5.2 * 38.67`. What is not invented is the OUTPUT: that is the exact
 * float the app stores, and before this it was the exact string a person read on the screen.
 */
test('a converted marker is written at a precision an assay could have', () => {
  assert.equal(formatMeasured(0.8031674208144796, 'mg/dL'), '0.8 mg/dL', 'creatinine, 71 µmol/L');
  assert.equal(formatMeasured(90.09100000000001, 'mg/dL'), '90.1 mg/dL', 'glucose, 5.0 mmol/L');
  assert.equal(formatMeasured(129.73104, 'mg/dL'), '130 mg/dL', 'glucose, 7.2 mmol/L');
  assert.equal(formatMeasured(201.084, 'mg/dL'), '201 mg/dL', 'cholesterol, 5.2 mmol/L');
  assert.equal(formatMeasured(203.71099999999996, 'mg/dL'), '204 mg/dL', 'triglycerides, 2.3 mmol/L');
  assert.equal(formatMeasured(59.938500000000005, 'mg/dL'), '59.9 mg/dL', 'HDL, 1.55 mmol/L');
});

/** A value typed in the unit it is stored in comes back out unchanged. Nothing is invented. */
test('a marker typed in its own unit is printed as it was typed', () => {
  assert.equal(formatMeasured(4.4, 'g/dL'), '4.4 g/dL');
  assert.equal(formatMeasured(95, 'mg/dL'), '95 mg/dL');
  assert.equal(formatMeasured(6.2, '10³/µL'), '6.2 10³/µL');
  assert.equal(formatMeasured(88, 'fL'), '88 fL');
});

/**
 * A percentage is glued to its symbol, which this file already decided for `suffix`. Three of the
 * seventeen markers a panel can hold are percentages — lymphocytes, red cell width, and HbA1c — and
 * "32.5 %" is not how one is written in English.
 */
test('a percentage keeps its symbol, and a bare number gets nothing', () => {
  assert.equal(formatMeasured(32.5, '%'), '32.5%');
  assert.equal(formatMeasured(12.9, ' % '), '12.9%', 'whitespace around a unit is not a unit');
  assert.equal(formatMeasured(3.55, ''), '3.6', 'the total-to-HDL ratio has no unit to invent');
});

/** The absence law, in the one place it is cheapest to enforce. Never "NaN", never a silent zero. */
test('a value that is not a number is absent, not printed', () => {
  assert.equal(formatMeasured(Number.NaN, 'mg/dL'), null);
  assert.equal(formatMeasured(Number.POSITIVE_INFINITY, 'mg/dL'), null);
});

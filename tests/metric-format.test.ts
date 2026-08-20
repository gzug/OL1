import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VALUE_FORMATS,
  formatDelta,
  formatDuration,
  formatDurationLong,
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

import assert from 'node:assert/strict';
import test from 'node:test';

import { LEVINE_MARKERS, filledCount, isValidTestDate, markerProblem, panelProblems } from '../src/ui/labs/levine';
import { EXTRA_MARKERS } from '../src/ui/labs/lipids';

/**
 * The Clinical Safety Gate, ported from Legacy `data/health/labSchema.ts`. The ranges catch a
 * misread unit or a typo. They say nothing about whether a value is healthy, and no test here may
 * ever start asserting that they do.
 */

test('the nine Levine markers are all present, each with a unit and a sane range', () => {
  assert.equal(LEVINE_MARKERS.length, 9);
  const keys = LEVINE_MARKERS.map((marker) => marker.key);
  assert.deepEqual(
    [...keys].sort(),
    ['albumin', 'alp', 'creatinine', 'crp', 'glucose', 'lymph_pct', 'mcv', 'rdw', 'wbc'],
  );

  for (const marker of LEVINE_MARKERS) {
    assert.ok(marker.unit.length > 0, `${marker.key} has no unit`);
    assert.ok(marker.sane.min < marker.sane.max, `${marker.key} has an inverted range`);
    assert.ok(marker.sane.min > 0, `${marker.key} allows a non-positive value`);
  }
});

/**
 * A panel that simply does not include a marker is ordinary. Forcing a number would invite an
 * invented one, which is the opposite of what the verification gate is for.
 */
test('an empty marker is not a problem', () => {
  for (const marker of LEVINE_MARKERS) {
    assert.equal(markerProblem(marker, ''), null);
    assert.equal(markerProblem(marker, '   '), null);
  }
});

test('a value outside the sane range is caught, on every marker', () => {
  for (const marker of LEVINE_MARKERS) {
    assert.equal(
      markerProblem(marker, String(marker.sane.max * 10)),
      'outsideSane',
      `${marker.key} accepted a value ten times its maximum`,
    );
    assert.equal(markerProblem(marker, String(marker.sane.min / 10)), 'outsideSane');
    assert.equal(markerProblem(marker, String(marker.sane.min)), null, 'the boundary is allowed');
    assert.equal(markerProblem(marker, String(marker.sane.max)), null, 'the boundary is allowed');
  }
});

test('text that is not a number is caught before the range is', () => {
  const albumin = LEVINE_MARKERS[0];
  for (const text of ['abc', '4,2', '3.1.4', '--']) {
    assert.equal(markerProblem(albumin, text), 'notANumber', `"${text}" was read as a number`);
  }
});

/**
 * Legacy's `isValidLabTestDate`, same rule: a panel cannot have been drawn in the future, and the
 * date has to be a real one rather than merely digit-shaped.
 */
test('a panel cannot be drawn in the future, or on a day that does not exist', () => {
  const today = '2026-08-03';
  assert.equal(isValidTestDate('2026-03-12', today), true);
  assert.equal(isValidTestDate(today, today), true, 'today is allowed');
  assert.equal(isValidTestDate('2026-08-04', today), false, 'tomorrow is not');
  assert.equal(isValidTestDate('2026-02-30', today), false, 'February has no 30th');
  assert.equal(isValidTestDate('2026-13-01', today), false);
  assert.equal(isValidTestDate('12/03/2026', today), false);
  assert.equal(isValidTestDate('', today), false);
});

test('a panel reports every problem, not just the first', () => {
  const entries = LEVINE_MARKERS.map((marker) => ({
    key: marker.key,
    text: String(marker.sane.max * 10),
  }));
  assert.equal(panelProblems(entries).length, 9, 'approval must be blocked on all of them at once');
});

test('filled markers are counted, blanks are not', () => {
  const entries = LEVINE_MARKERS.map((marker, index) => ({
    key: marker.key,
    text: index < 3 ? '1' : '  ',
  }));
  assert.equal(filledCount(entries), 3);
});

/**
 * **A count must say what it counted.**
 *
 * The panel screen holds seventeen rows now — the nine the formula reads and eight it does not.
 * Counting all of them against a label reading "of 9" prints "12 of 9 filled" the moment somebody
 * types a lipid, which is a label describing a screen that changed underneath it.
 */
test('filling a lipid does not count towards the nine', () => {
  const entries = [
    { key: 'albumin', text: '4.4' },
    { key: 'creatinine', text: '0.9' },
    { key: 'ldl', text: '120' },
    { key: 'hdl', text: '55' },
  ];

  assert.equal(filledCount(entries), 2, 'only the nine count against "of 9"');
  assert.equal(filledCount(entries, EXTRA_MARKERS), 2, 'and the extras count against their own');
});

/** A lipid is validated by its own conversion table, not the formula's. */
test('a lipid typed in mmol/L is accepted, and an impossible one is not', () => {
  const ldl = EXTRA_MARKERS.find((marker) => marker.key === 'ldl');
  assert.ok(ldl !== undefined);

  assert.equal(markerProblem(ldl, '3.1', 'mmol/L'), null, '3.1 mmol/L is an ordinary LDL');
  assert.equal(markerProblem(ldl, '3.1', 'mg/dL'), null, 'and so is a low one in mg/dL');
  assert.equal(markerProblem(ldl, '9999', 'mg/dL'), 'outsideSane');
  assert.equal(markerProblem(ldl, 'x', 'mg/dL'), 'notANumber');
});

/**
 * Triglycerides have their own factor, and a screen that used cholesterol's would accept a value it
 * should reject — 1.7 mmol/L is ordinary, and read with the wrong factor it is 65 rather than 150.
 */
test('a triglyceride is converted by its own factor before it is judged', () => {
  const tg = EXTRA_MARKERS.find((marker) => marker.key === 'triglycerides');
  assert.ok(tg !== undefined);

  assert.equal(markerProblem(tg, '1.7', 'mmol/L'), null);
  assert.equal(markerProblem(tg, '50', 'mmol/L'), 'outsideSane', '50 mmol/L is not a person');
});

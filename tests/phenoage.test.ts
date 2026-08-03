import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REFERENCE_BOUNDS,
  REQUIRED_MARKERS,
  computePhenoAge,
  computePhenoAgeRange,
} from '../src/application/labs/phenoAge';

/** A complete, plausible panel. Invented — no value here comes from a person. */
const PANEL = {
  albumin: 4.4,
  alp: 62,
  creatinine: 0.9,
  crp: 0.8,
  glucose: 88,
  lymph_pct: 31,
  mcv: 89,
  rdw: 12.8,
  wbc: 5.6,
};

test('a complete panel produces a plausible age', () => {
  const value = computePhenoAge({ chronologicalAge: 44, markers: PANEL });
  assert.ok(value !== null, 'a full panel must produce a number');
  assert.ok((value as number) > 15 && (value as number) < 120, `got ${value}, outside any human range`);
});

/**
 * Null is a real answer, not a failure to handle. Legacy refuses rather than substituting, and every
 * one of these paths is a place a "best effort" number could otherwise have been invented.
 */
test('anything missing or impossible returns null, never a guess', () => {
  for (const key of REQUIRED_MARKERS) {
    const { [key]: _dropped, ...rest } = PANEL;
    assert.equal(
      computePhenoAge({ chronologicalAge: 44, markers: rest }),
      null,
      `dropping ${key} still produced a number`,
    );
  }
  assert.equal(computePhenoAge({ chronologicalAge: 0, markers: PANEL }), null);
  assert.equal(computePhenoAge({ chronologicalAge: Number.NaN, markers: PANEL }), null);
  assert.equal(computePhenoAge({ chronologicalAge: 44, markers: { ...PANEL, crp: 0 } }), null);
  assert.equal(computePhenoAge({ chronologicalAge: 44, markers: { ...PANEL, wbc: -1 } }), null);
});

test('age moves the number in the direction it should', () => {
  const younger = computePhenoAge({ chronologicalAge: 30, markers: PANEL });
  const older = computePhenoAge({ chronologicalAge: 60, markers: PANEL });
  assert.ok(younger !== null && older !== null);
  assert.ok((older as number) > (younger as number), 'a older person must not read younger');
});

test('a full panel reports ready, with the point between the bounds', () => {
  const range = computePhenoAgeRange({ chronologicalAge: 44, markers: PANEL });
  assert.equal(range.status, 'ready');
  if (range.status !== 'ready') return;
  assert.equal(range.markersPresent, 9);
  assert.deepEqual(range.missing, []);
  assert.ok(range.low <= range.point && range.point <= range.high);
  assert.ok(range.high - range.low < 1e-6, 'nothing is missing, so there is nothing to bracket');
});

/**
 * The point of the range: a partial panel says "somewhere between", never a point pretending to be
 * a measurement. The bracket must actually widen as markers go missing.
 */
test('a partial panel widens into a range rather than narrowing to a figure', () => {
  const { crp: _c, wbc: _w, ...partial } = PANEL;
  const range = computePhenoAgeRange({ chronologicalAge: 44, markers: partial });
  assert.equal(range.status, 'ready');
  if (range.status !== 'ready') return;
  assert.equal(range.markersPresent, 7);
  assert.deepEqual([...range.missing].sort(), ['crp', 'wbc']);
  assert.ok(range.high > range.low, 'two missing markers must produce a real bracket');
});

test('below six markers it refuses to produce any number at all', () => {
  const range = computePhenoAgeRange({
    chronologicalAge: 44,
    markers: { albumin: 4.4, alp: 62, creatinine: 0.9, crp: 0.8, glucose: 88 },
  });
  assert.equal(range.status, 'calibrating');
  assert.equal(range.markersPresent, 5);
  assert.ok(!('point' in range), 'calibrating must not carry a number anywhere on it');
});

test('every required marker has reference bounds, and they are ordered', () => {
  for (const key of REQUIRED_MARKERS) {
    const bound = REFERENCE_BOUNDS[key];
    assert.ok(bound !== undefined, `${key} has no bounds to bracket with`);
    assert.ok(bound.min < bound.max, `${key} bounds are inverted`);
  }
});

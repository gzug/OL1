import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CRP_FLOOR_MGL,
  REFERENCE_BOUNDS,
  REQUIRED_MARKERS,
  bioAgeDrivers,
  computePhenoAge,
  computePhenoAgeRange,
  crpAsModelled,
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

/**
 * The CRP floor — the edge of the data the model was fitted on, not a safety clamp.
 *
 * NHANES III could not measure CRP below roughly 0.21 mg/dL, so Levine's `0.0954 × ln(CRP)` was
 * estimated from a sample where CRP never went lower. A modern hs-CRP assay reads an order of
 * magnitude finer, and `ln` has no floor — so an unclamped low CRP walks the number downward
 * without limit, into a region the regression has no information about.
 *
 * Found by checking a real result against a commercial app: OL1 said 26.4 where it said 27.9, and
 * the whole difference was this. Clamping is the less flattering answer and the correct one.
 */
test('CRP below the fitted floor is read at the floor, not extrapolated', () => {
  const at = (crp: number) => computePhenoAge({ chronologicalAge: 33, markers: { ...PANEL, crp } });

  assert.equal(at(CRP_FLOOR_MGL / 2), at(CRP_FLOOR_MGL), 'half the floor must read as the floor');
  assert.equal(at(0.05), at(CRP_FLOOR_MGL), 'an order of magnitude under is still the floor');
  assert.equal(at(0.001), at(CRP_FLOOR_MGL));

  assert.equal(crpAsModelled(0.6), CRP_FLOOR_MGL);
  assert.equal(crpAsModelled(5), 5, 'above the floor nothing is touched');
});

/**
 * The failure the floor prevents, stated as a property rather than a number: without it, driving
 * CRP toward zero drives the age toward negative infinity. With it, the answer stops moving.
 */
test('a vanishing CRP cannot walk the number downward without limit', () => {
  const at = (crp: number) => computePhenoAge({ chronologicalAge: 33, markers: { ...PANEL, crp } });
  const floored = at(CRP_FLOOR_MGL) as number;

  for (const crp of [1, 0.1, 0.01, 0.0001]) {
    assert.equal(at(crp), floored, `CRP ${crp} moved the answer below the fitted range`);
  }

  // And the floor really is doing work — above it, CRP still moves the number.
  assert.ok((at(10) as number) > floored, 'a raised CRP must still raise the age');
});

/**
 * Below the floor the model cannot tell two people apart, so it must not claim one of them is
 * being moved by their CRP. The drivers compare at the floor on both sides, which cancels.
 */
test('CRP is not named as a driver when it sits under the floor', () => {
  const drivers = bioAgeDrivers({ chronologicalAge: 33, markers: { ...PANEL, crp: 0.4 } });

  assert.ok(drivers !== null);
  const named = [...(drivers?.pushingUp ?? []), ...(drivers?.helpingDown ?? [])];
  assert.ok(!named.some((driver) => driver.key === 'crp'), 'CRP was ranked from a value the model cannot see');
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { bioAgeDrivers, computePhenoAge } from '../src/application/labs/phenoAge';

/** A panel sitting exactly on the reference values, so a single marker can be moved on its own. */
const AT_REFERENCE = {
  albumin: 4.5,
  alp: 70,
  creatinine: 0.9,
  crp: 1.0,
  glucose: 90,
  lymph_pct: 30,
  mcv: 88,
  rdw: 13.5,
  wbc: 6.5,
};

const panel = (overrides: Partial<typeof AT_REFERENCE> = {}) => ({
  chronologicalAge: 44,
  markers: { ...AT_REFERENCE, ...overrides },
});

/**
 * THE POINT OF THIS MODULE — Legacy's note: the per-marker impact is model-internal and "MUST NOT
 * reach the UI face". A driver carries a direction and a position in an order, and nothing else.
 *
 * "Your CRP is costing you 3.2 years" is a sentence this app must never say: a clinical claim
 * dressed as arithmetic, from a regression fitted on a population, about one blood draw. This test
 * is what stops a numeric field being added to that type by someone who means well.
 */
test('a driver carries direction and rank and nothing else', () => {
  const drivers = bioAgeDrivers(panel({ crp: 6, rdw: 15 }));
  assert.ok(drivers !== null);

  for (const driver of [...drivers.pushingUp, ...drivers.helpingDown]) {
    assert.deepEqual(
      Object.keys(driver).sort(),
      ['direction', 'key', 'rank'],
      'a field was added to BioAgeDriver — if it is a quantity, it must not be there',
    );
    assert.equal(typeof driver.rank, 'number');
    assert.ok(driver.rank >= 1, 'rank is a position, starting at one');
  }
});

test('a marker above its reference pushes the number up', () => {
  const drivers = bioAgeDrivers(panel({ rdw: 16 }));
  assert.equal(drivers?.pushingUp[0]?.key, 'rdw');
  assert.equal(drivers?.pushingUp[0]?.direction, 'up');
  assert.equal(drivers?.pushingUp[0]?.rank, 1);
});

/**
 * Albumin's coefficient is negative, so MORE albumin reads the age lower. Getting this backwards
 * would tell somebody the wrong thing about their own panel, which is why it is asserted rather
 * than assumed from the sign of the input.
 */
test('a marker with a negative coefficient helps the number down when it rises', () => {
  const drivers = bioAgeDrivers(panel({ albumin: 5.0 }));
  assert.equal(drivers?.helpingDown[0]?.key, 'albumin');
  assert.equal(drivers?.helpingDown[0]?.direction, 'down');
});

test('the biggest mover is ranked first', () => {
  const drivers = bioAgeDrivers(panel({ alp: 75, rdw: 17 }));
  assert.equal(drivers?.pushingUp[0]?.key, 'rdw', 'a smaller lever was ranked above a larger one');
  assert.equal(drivers?.pushingUp[1]?.key, 'alp');
});

/** Two up and one down: a list of nine is a wall, and this is what a person can hold. */
test('at most two pushing up and one helping down', () => {
  const drivers = bioAgeDrivers(
    panel({ alp: 120, crp: 8, glucose: 130, mcv: 95, rdw: 16, wbc: 9 }),
  );
  assert.ok((drivers?.pushingUp.length ?? 0) <= 2);
  assert.ok((drivers?.helpingDown.length ?? 0) <= 1);
});

test('fewer than the maximum is returned when fewer exist', () => {
  const drivers = bioAgeDrivers(panel());
  assert.ok(drivers !== null, 'a panel exactly on the reference still has drivers to report');
  assert.equal(drivers.pushingUp.length, 0);
  assert.equal(drivers.helpingDown.length, 0);
});

/**
 * The same refusal `computePhenoAge` makes. A panel that cannot produce a number cannot produce
 * drivers for that number either, and returning an empty list would read as "nothing is moving it".
 */
test('an incomplete panel has no drivers, the same way it has no number', () => {
  const missing = { chronologicalAge: 44, markers: { ...AT_REFERENCE, crp: undefined } };
  assert.equal(bioAgeDrivers(missing), null);
  assert.equal(computePhenoAge(missing), null);
});

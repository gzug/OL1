import assert from 'node:assert/strict';
import test from 'node:test';

import { MEANINGFUL_CHANGE, apartInWords, comparePanels } from '../src/application/labs/panelChange';

/**
 * The app says in three places that a second panel turns a reading into a direction. This is the
 * machinery behind that sentence — and the discipline it has to keep is that **two panels are a
 * line, not a trend.**
 *
 * Blood moves for reasons that have nothing to do with health: time of day, hydration, a hard
 * session, a cold a fortnight ago, and the assay's own imprecision. Every value here is invented.
 */

const PANEL = { albumin: 4.4, alp: 62, creatinine: 0.9, crp: 0.8, glucose: 88, lymph_pct: 31, mcv: 89, rdw: 12.8, wbc: 5.6 };

const at = (markers: Record<string, number>, recordedAt: string) => ({ markers, recordedAt });

test('a marker that moved is reported with both values and a direction', () => {
  const { changes } = comparePanels(
    at(PANEL, '2026-02-01T00:00:00.000Z'),
    at({ ...PANEL, glucose: 105 }, '2026-08-01T00:00:00.000Z'),
  );

  const glucose = changes.find((change) => change.key === 'glucose');
  assert.equal(glucose?.from, 88);
  assert.equal(glucose?.to, 105);
  assert.equal(glucose?.direction, 'up');
  assert.equal(glucose?.unit, 'mg/dL');
});

/**
 * **The rule this file exists for.** A marker that reads 4.4 and then 4.5 has not improved, and a
 * screen that draws an arrow on it is inventing a trajectory out of assay noise.
 */
test('a small move is shown but never described as a direction', () => {
  const { changes } = comparePanels(
    at(PANEL, '2026-02-01T00:00:00.000Z'),
    at({ ...PANEL, albumin: 4.5 }, '2026-08-01T00:00:00.000Z'),
  );

  const albumin = changes.find((change) => change.key === 'albumin');
  assert.equal(albumin?.notable, false, 'a 2% move must not be notable');
  assert.equal(albumin?.from, 4.4, 'both values are still shown');
  assert.equal(albumin?.to, 4.5);
});

test('the threshold is the boundary it claims to be, in both directions', () => {
  const justUnder = 4.4 * (1 + MEANINGFUL_CHANGE * 0.9);
  const justOver = 4.4 * (1 + MEANINGFUL_CHANGE * 1.1);
  const notable = (albumin: number) =>
    comparePanels(at(PANEL, '2026-02-01T00:00:00.000Z'), at({ ...PANEL, albumin }, '2026-08-01T00:00:00.000Z'))
      .changes.find((change) => change.key === 'albumin')?.notable;

  assert.equal(notable(justUnder), false);
  assert.equal(notable(justOver), true);
  assert.equal(notable(4.4 * (1 - MEANINGFUL_CHANGE * 1.1)), true, 'a fall must count as much as a rise');
});

/** A marker on only one panel has no direction. Half a comparison is not a comparison. */
test('a marker on only one of the two panels claims no direction at all', () => {
  const { changes, onlyOnOne } = comparePanels(
    at(PANEL, '2026-02-01T00:00:00.000Z'),
    at({ ...PANEL, crp: undefined as unknown as number }, '2026-08-01T00:00:00.000Z'),
  );

  const crp = changes.find((change) => change.key === 'crp');
  assert.equal(crp?.direction, null);
  assert.equal(crp?.to, null);
  assert.equal(crp?.from, 0.8, 'the value that does exist is still shown');
  assert.deepEqual(onlyOnOne, ['crp']);
});

/** A marker on neither panel is not a row. Nine empty rows is not a comparison either. */
test('a marker on neither panel produces no row', () => {
  const two = { albumin: 4.4, creatinine: 0.9 };
  const { changes } = comparePanels(at(two, '2026-02-01T00:00:00.000Z'), at(two, '2026-08-01T00:00:00.000Z'));

  assert.deepEqual(changes.map((change) => change.key).sort(), ['albumin', 'creatinine']);
});

/**
 * A change over six days is a different claim from one over a year, and a screen showing two
 * numbers without the interval invites the reader to supply their own.
 */
test('the gap between draws is measured and said in words', () => {
  const { daysApart } = comparePanels(
    at(PANEL, '2026-02-01T00:00:00.000Z'),
    at(PANEL, '2026-08-01T00:00:00.000Z'),
  );

  assert.equal(daysApart, 181);
  assert.equal(apartInWords(0), 'drawn the same day');
  assert.equal(apartInWords(1), 'a day apart');
  assert.equal(apartInWords(9), '9 days apart');
  assert.equal(apartInWords(30), 'about a month apart');
  assert.equal(apartInWords(181), 'about 6 months apart');
  assert.equal(apartInWords(760), 'about 2 years apart');
});

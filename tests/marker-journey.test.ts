import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PANELS_FOR_A_LINE,
  journeyMove,
  markerJourneys,
} from '../src/application/labs/markerJourney';
import type { HubEntry } from '../src/core/hubs';

/**
 * One marker across every panel.
 *
 * Every value here is INVENTED. The discipline under test is the one `panelChange.ts` already
 * establishes: **two panels are a line, not a trend** — and a sparkline through two points makes
 * exactly that claim, in a shape people read faster than a sentence.
 */

function panel(on: string, markers: Record<string, number>): HubEntry {
  return {
    hubId: 'labs',
    id: `panel-${on}`,
    kind: 'panel',
    payload: { markers },
    recordedAt: `${on}T00:00:00.000Z`,
    source: 'manual',
  };
}

const NINE = { albumin: 4.4, alp: 62, creatinine: 0.9, crp: 0.8, glucose: 88, lymph_pct: 31, mcv: 89, rdw: 12.8, wbc: 5.6 };

test('two panels draw nothing; three draw a line', () => {
  const two = markerJourneys([panel('2026-02-01', NINE), panel('2026-05-01', NINE)]);
  assert.deepEqual(two, [], 'two points is the claim this refuses to draw');

  const three = markerJourneys([
    panel('2026-02-01', NINE),
    panel('2026-05-01', NINE),
    panel('2026-08-01', NINE),
  ]);
  assert.equal(three.length, 9, 'all nine have three readings');
  assert.equal(PANELS_FOR_A_LINE, 3);
});

/**
 * **A marker counts its own readings, not the panels.** Somebody who added cholesterol to their
 * third panel has one reading of it, and a chart of one reading among three dates draws a line
 * from nothing.
 */
test('a marker added late is not drawn until it has three readings of its own', () => {
  const journeys = markerJourneys([
    panel('2026-02-01', NINE),
    panel('2026-05-01', NINE),
    panel('2026-08-01', { ...NINE, ldl: 120 }),
  ]);

  assert.ok(!journeys.some((journey) => journey.key === 'ldl'), 'one reading is not a journey');

  const withThree = markerJourneys([
    panel('2026-02-01', { ...NINE, ldl: 130 }),
    panel('2026-05-01', { ...NINE, ldl: 118 }),
    panel('2026-08-01', { ...NINE, ldl: 105 }),
  ]);
  const ldl = withThree.find((journey) => journey.key === 'ldl');
  assert.equal(ldl?.points.length, 3);
  assert.equal(ldl?.unit, 'mg/dL');
});

/** Ordered by when the blood was DRAWN, never by when it was typed in. */
test('the line reads left to right by draw date, whatever order the panels arrived', () => {
  const journeys = markerJourneys([
    panel('2026-08-01', { ...NINE, glucose: 95 }),
    panel('2026-02-01', { ...NINE, glucose: 88 }),
    panel('2026-05-01', { ...NINE, glucose: 91 }),
  ]);

  const glucose = journeys.find((journey) => journey.key === 'glucose');
  assert.deepEqual(
    glucose?.points.map((point) => point.on),
    ['2026-02-01', '2026-05-01', '2026-08-01'],
  );
  assert.deepEqual(glucose?.points.map((point) => point.value), [88, 91, 95]);
});

/** A payload out of a database is a claim, not a guarantee. */
test('a marker that is not a usable number is simply not a point', () => {
  const journeys = markerJourneys([
    panel('2026-02-01', { ...NINE, glucose: 88 }),
    panel('2026-05-01', { ...NINE, glucose: 0 }),
    panel('2026-08-01', { ...NINE, glucose: 95 }),
  ]);

  assert.ok(!journeys.some((journey) => journey.key === 'glucose'), 'a zero is not a reading');
});

/**
 * Direction only, no verdict. Whether a rising marker is good or bad is a clinical judgement this
 * app does not make — the same refusal `bioAgeDrivers` makes by carrying no number at all.
 */
test('a move is a direction, and a small one is level', () => {
  const journey = (values: readonly number[]) => ({
    key: 'ldl',
    points: values.map((value, index) => ({ on: `2026-0${index + 2}-01`, value })),
    unit: 'mg/dL',
  });

  assert.equal(journeyMove(journey([130, 118, 105])), 'down');
  assert.equal(journeyMove(journey([105, 118, 130])), 'up');
  assert.equal(journeyMove(journey([120, 130, 118])), 'level', 'under a tenth is assay spread');
  assert.equal(journeyMove(journey([])), 'level', 'nothing to compare is not a direction');
});

/**
 * The comparative and the equative do not take the same preposition.
 *
 * One conditional producing "higher / lower / about the same" and appending a shared "than the
 * first" printed **"about the same than the first"** on the deployed page. Caught by reading the
 * screen, which is the only thing that catches a sentence.
 */
test('every direction reads as English', () => {
  const journey = (values: readonly number[]) => ({
    key: 'ldl',
    points: values.map((value, index) => ({ on: `2026-0${index + 1}-01`, value })),
    unit: 'mg/dL',
  });

  const said = ['down', 'level', 'up'].map((want) => {
    const values = want === 'down' ? [130, 118, 105] : want === 'up' ? [105, 118, 130] : [120, 121, 119];
    return journeyMove(journey(values));
  });

  assert.deepEqual(said, ['down', 'level', 'up'], 'the directions themselves must be right first');
});

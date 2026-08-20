import assert from 'node:assert/strict';
import test from 'node:test';

import { bioAgeFrom, type BioAge } from '../src/application/twin/bioAge';
import type { HubEntry } from '../src/core/hubs';
import { bloodWorkSource, missingLine } from '../src/ui/twin/bioAgeCopy';

/**
 * The Twin's number, and the four things that can honestly be true about it.
 *
 * These exist because the screen showed a hard-coded 41.6 for weeks. A fixture that looks exactly
 * like a result is the most expensive kind of placeholder — nobody reports it as broken — so the
 * rule worth pinning is not "the number is right" but **no number appears unless both inputs are
 * really there**.
 *
 * Every value below is INVENTED. No real panel is in this repository and none may be.
 */

const TODAY = new Date('2026-08-20T09:00:00.000Z');

/** A complete, plausible panel. Same invented values as `tests/phenoage.test.ts`. */
const MARKERS = {
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

function panel(recordedAt: string, markers: Record<string, unknown> = MARKERS): HubEntry {
  return {
    hubId: 'labs',
    id: `panel-${recordedAt}`,
    kind: 'panel',
    payload: { markers },
    recordedAt,
    source: 'manual',
  };
}

test('no panel waits, and says it is the panel that is missing', () => {
  const state = bioAgeFrom([], 1985, TODAY);

  assert.equal(state.status, 'waiting');
  assert.equal(state.status === 'waiting' && state.reason, 'noPanel');
});

/**
 * The half that is easy to forget. Chronological age is an ARGUMENT to the Levine formula, so a
 * panel without a birth year produces nothing — and the screen must not fall back to an assumed
 * age, which would be a number about a person nobody described.
 */
test('a panel with no birth year still produces no number', () => {
  const state = bioAgeFrom([panel('2026-05-08T00:00:00.000Z')], null, TODAY);

  assert.equal(state.status, 'waiting');
  assert.equal(state.status === 'waiting' && state.reason, 'noYear');
});

test('a complete panel and a birth year produce a number, with the date it was drawn', () => {
  const state = bioAgeFrom([panel('2026-05-08T00:00:00.000Z')], 1985, TODAY);

  assert.equal(state.status, 'ready');
  if (state.status !== 'ready') return;

  assert.equal(state.drawnAt, '2026-05-08T00:00:00.000Z');
  assert.deepEqual(state.range.missing, []);
  assert.ok(state.range.point > 15 && state.range.point < 120, `got ${state.range.point}`);
  assert.ok(state.drivers !== null, 'a full panel has drivers');
});

/**
 * `recordedAt` is when the blood was DRAWN, not when somebody typed it in. A March panel entered
 * this afternoon must not displace an August one — the schema makes that distinction and this is
 * one of the two places it earns its keep.
 */
test('the newest panel wins by draw date, not by entry order', () => {
  const state = bioAgeFrom(
    [panel('2026-05-08T00:00:00.000Z'), panel('2026-08-01T00:00:00.000Z')],
    1985,
    TODAY,
  );

  assert.equal(state.status === 'ready' && state.drawnAt, '2026-08-01T00:00:00.000Z');
});

test('below six markers it refuses to show any figure, not a wide one', () => {
  const { albumin, alp, creatinine, crp } = MARKERS;
  const state = bioAgeFrom(
    [panel('2026-08-01T00:00:00.000Z', { albumin, alp, creatinine, crp })],
    1985,
    TODAY,
  );

  assert.equal(state.status, 'calibrating');
});

/**
 * A payload is JSON out of a database — its shape is a claim, not a guarantee. A marker that is a
 * string, a null, a zero or a NaN is dropped rather than passed on, so one bad row costs one marker
 * instead of the whole panel.
 */
test('a payload that is not what it claims costs one marker, not the panel', () => {
  const state = bioAgeFrom(
    [panel('2026-08-01T00:00:00.000Z', { ...MARKERS, crp: '0.8', rdw: 0, wbc: null })],
    1985,
    TODAY,
  );

  assert.equal(state.status, 'ready', 'six good markers are still enough');
  if (state.status !== 'ready') return;

  assert.deepEqual([...state.range.missing].sort(), ['crp', 'rdw', 'wbc']);
  assert.ok(state.range.low < state.range.high, 'a partial panel is a range, not a point');
  assert.equal(state.drivers, null, 'drivers need every marker, and say so by being absent');
});

/** A panel with no markers at all is not a panel. */
test('a panel whose payload has no markers calibrates rather than throwing', () => {
  assert.equal(bioAgeFrom([panel('2026-08-01T00:00:00.000Z', {})], 1985, TODAY).status, 'calibrating');
});

/**
 * The row under *What this number is made of* must agree with the number itself.
 *
 * It was a fixture reading “9 of 9 markers, from the panel drawn 12 Mar”, and it survived the first
 * pass at wiring the number — so the deployed preview said it had no panel and, two centimetres
 * below, that it had all nine markers from one. Half-fixing a dishonest screen leaves the two halves
 * contradicting each other in public.
 */
test('the source row never claims markers the number does not have', () => {
  const cases: BioAge[] = [
    bioAgeFrom([], 1985, TODAY),
    bioAgeFrom([panel('2026-08-01T00:00:00.000Z')], null, TODAY),
    bioAgeFrom([panel('2026-08-01T00:00:00.000Z', { albumin: 4.4, alp: 62 })], 1985, TODAY),
  ];

  for (const state of cases) {
    const row = bloodWorkSource(state);
    assert.equal(row.state, 'missing', `${state.status} must not show as reading`);
    assert.ok(!row.detail.includes('9 of 9'), `"${row.detail}" claims a full panel`);
  }

  const ready = bloodWorkSource(bioAgeFrom([panel('2026-08-01T00:00:00.000Z')], 1985, TODAY));
  assert.equal(ready.state, 'reading');
  assert.ok(ready.detail.startsWith('9 of 9 markers, drawn'), ready.detail);
});

/**
 * The waiting line must name which input is missing.
 *
 * A blank space and a broken screen look identical, and the difference between them is the only
 * thing a person can act on: add a panel, or give a year of birth.
 */
test('waiting says which of the two inputs it is waiting for', () => {
  const noPanel = bloodWorkSource(bioAgeFrom([], 1985, TODAY));
  const noYear = bloodWorkSource(bioAgeFrom([panel('2026-08-01T00:00:00.000Z')], null, TODAY));

  assert.notEqual(noPanel.detail, noYear.detail, 'both empty states read the same');
  assert.match(noYear.detail, /birth/i);
});

/** A range is a range. `missingLine` must never describe a partial panel as a figure. */
test('a partial panel is described as a range, and names how much is absent', () => {
  const { albumin, alp, creatinine, crp, glucose, lymph_pct } = MARKERS;
  const state = bioAgeFrom(
    [panel('2026-08-01T00:00:00.000Z', { albumin, alp, creatinine, crp, glucose, lymph_pct })],
    1985,
    TODAY,
  );

  assert.equal(state.status, 'ready');
  if (state.status !== 'ready') return;

  assert.match(missingLine(state.range), /range rather than a figure/);
  assert.match(missingLine(state.range), /3 markers/);
});

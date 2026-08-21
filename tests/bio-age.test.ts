import assert from 'node:assert/strict';
import test from 'node:test';

import { CRP_FLOOR_MGL } from '../src/application/labs/phenoAge';
import { bioAgeFrom, type BioAge } from '../src/application/twin/bioAge';
import type { HubEntry } from '../src/core/hubs';
import { bloodWorkSource, missingLine } from '../src/ui/twin/bioAgeCopy';
import { methodRows } from '../src/ui/twin/bioAgeMethod';

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

/**
 * The explainer must describe the panel the number actually came from.
 *
 * The owner asked for it the moment two apps disagreed about his blood, which is exactly when an
 * explanation that re-reads the store — and so can describe a different panel — is worse than none.
 * `PanelInputs` is carried out of the calculation with the result for that reason.
 */
test('what went in is the panel the number came from, in the formula’s units', () => {
  const state = bioAgeFrom([panel('2026-05-08T00:00:00.000Z')], 1985, TODAY);

  assert.equal(state.status, 'ready');
  if (state.status !== 'ready') return;

  const rows = methodRows(state.used);
  assert.equal(rows.length, 9, 'every marker that went in must be shown');
  assert.equal(state.used.chronologicalAge, 41);

  const albumin = rows.find((row) => row.key === 'albumin');
  assert.equal(albumin?.asRead, MARKERS.albumin);
  assert.equal(albumin?.unit, 'g/dL');
});

/**
 * CRP is the one input the formula deliberately reads as something other than what was measured.
 * A number silently different from the one on a person's report is precisely what an explanation
 * exists to prevent, so the row has to say so out loud.
 */
test('a floored CRP says so, and says what the report actually read', () => {
  const state = bioAgeFrom([panel('2026-05-08T00:00:00.000Z', { ...MARKERS, crp: 0.6 })], 1985, TODAY);

  assert.equal(state.status, 'ready');
  if (state.status !== 'ready') return;

  const crp = methodRows(state.used).find((row) => row.key === 'crp');
  assert.equal(crp?.asRead, CRP_FLOOR_MGL, 'the row shows what the formula read, not what was typed');
  assert.ok(crp?.adjustment !== null, 'a silently substituted value is the thing this prevents');
  assert.ok(crp?.adjustment?.includes('0.6'), 'the real result must still appear');
});

/** Above the floor nothing is adjusted, and no row invents a note about it. */
test('a CRP above the floor is reported exactly as measured', () => {
  const state = bioAgeFrom([panel('2026-05-08T00:00:00.000Z', { ...MARKERS, crp: 4 })], 1985, TODAY);

  assert.equal(state.status, 'ready');
  if (state.status !== 'ready') return;

  const crp = methodRows(state.used).find((row) => row.key === 'crp');
  assert.equal(crp?.asRead, 4);
  assert.equal(crp?.adjustment, null);
});

/** A unit the laboratory printed differently is shown as the swap it was, not hidden. */
test('a marker entered in another unit says which one', () => {
  const state = bioAgeFrom(
    [
      {
        hubId: 'labs',
        id: 'p',
        kind: 'panel',
        payload: { markers: MARKERS, unitsAsEntered: { albumin: 'g/L' } },
        recordedAt: '2026-05-08T00:00:00.000Z',
        source: 'manual',
      },
    ],
    1985,
    TODAY,
  );

  assert.equal(state.status, 'ready');
  if (state.status !== 'ready') return;

  const rows = methodRows(state.used);
  assert.equal(rows.find((row) => row.key === 'albumin')?.asEntered, 'entered in g/L');
  assert.equal(rows.find((row) => row.key === 'mcv')?.asEntered, null, 'no swap, no note');
});

/**
 * **"I have not looked" is not "you have nothing".**
 *
 * `useBioAge` used to start at `{reason: 'noPanel', status: 'waiting'}` and leave it standing when
 * the read threw — so the first frame, and a store that would not open, both told a person their
 * blood results had never been added. Shape 1 of `docs/decisions/0013`.
 *
 * The pure layer cannot produce `unknown` — it is only ever reached with data in hand — so what is
 * asserted here is the contract the hook and the screens depend on: the state exists, and nothing
 * renders a claim from it.
 */
test('the unknown state makes no claim about a person’s data', () => {
  const row = bloodWorkSource({ status: 'unknown' });

  assert.equal(row.detail, '', 'an unread state must not describe the panel');
  assert.ok(!row.detail.includes('No panel'), 'that is a claim, and nothing has been read');
});

/** And every state that DOES make a claim has really been read. */
test('every state that says something about the panel came from a read', () => {
  const states: BioAge[] = [
    bioAgeFrom([], 1985, TODAY),
    bioAgeFrom([panel('2026-08-01T00:00:00.000Z')], null, TODAY),
    bioAgeFrom([panel('2026-08-01T00:00:00.000Z')], 1985, TODAY),
  ];

  for (const state of states) {
    assert.notEqual(state.status, 'unknown', 'a state built from data is never unknown');
    assert.notEqual(bloodWorkSource(state).detail, '', `${state.status} said nothing at all`);
  }
});

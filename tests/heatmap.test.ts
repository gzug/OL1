import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MS_PER_DAY,
  STALE_AFTER_DAYS,
  bucketOpacity,
  buildHeatmap,
  lifetimeLine,
  minutesByDate,
  mondayIndex,
  parseLocalDate,
} from '../src/application/exercise/heatmap';

const TODAY = '2026-08-19';

test('a date is read at UTC noon, so a day is a day whatever the clock says', () => {
  assert.equal(parseLocalDate('2026-08-19')?.toISOString(), '2026-08-19T12:00:00.000Z');
  assert.equal(parseLocalDate('nonsense'), null);
  assert.equal(parseLocalDate('2026-13-01'), null);
  assert.equal(parseLocalDate(''), null);
});

test('Monday is row zero — a training week does not start on Sunday', () => {
  assert.equal(mondayIndex(new Date('2026-08-17T12:00:00.000Z')), 0);
  assert.equal(mondayIndex(new Date('2026-08-23T12:00:00.000Z')), 6);
});

test('nothing logged is an empty grid that says it is empty', () => {
  const grid = buildHeatmap(new Map(), 12, TODAY);
  assert.equal(grid.hasData, false);
  assert.equal(grid.rows.length, 7);
  assert.equal(grid.rows[0]?.length, 12);
  for (const row of grid.rows) for (const cell of row) assert.equal(cell.localDate, null);
});

/**
 * PORTED DECISION — Legacy learned this one the hard way. Anchoring always to today makes a stale
 * dataset render an ever-emptier grid; anchoring always to the data makes someone who trained
 * yesterday see a grid ending last month. Fresh anchors to today, cold anchors to itself.
 */
test('recent data anchors the grid to today', () => {
  const grid = buildHeatmap(new Map([['2026-08-18', 40]]), 4, TODAY);
  const lastColumn = grid.rows.map((row) => row[row.length - 1]?.localDate);

  assert.ok(lastColumn.includes('2026-08-19'), 'the grid does not reach today');
});

test('data older than four weeks anchors the grid to itself', () => {
  const old = '2026-05-01';
  const grid = buildHeatmap(new Map([[old, 40]]), 4, TODAY);
  const dates = grid.rows.flat().map((cell) => cell.localDate);

  assert.ok(dates.includes(old), 'a stale dataset scrolled off its own grid');
  assert.ok(!dates.includes(TODAY), 'a stale dataset still anchored to today');
  assert.ok(
    new Date(TODAY).getTime() - new Date(old).getTime() > STALE_AFTER_DAYS * MS_PER_DAY,
    'this fixture is no longer stale, so the test has stopped testing anything',
  );
});

/**
 * Relative to the busiest day, not to a target. Same argument the body figure and the week strip
 * make: there is no target, and inventing one to divide by would be inventing the reading.
 */
test('the busiest day tops the scale, whatever it happens to be', () => {
  const light = buildHeatmap(new Map([['2026-08-18', 20]]), 4, TODAY);
  const heavy = buildHeatmap(new Map([['2026-08-18', 400]]), 4, TODAY);

  const bucketOf = (grid: ReturnType<typeof buildHeatmap>) =>
    grid.rows.flat().find((cell) => cell.localDate === '2026-08-18')?.bucket;

  assert.equal(bucketOf(light), 4);
  assert.equal(bucketOf(heavy), 4);
});

test('a quiet day next to a busy one sits below it', () => {
  const grid = buildHeatmap(
    new Map([
      ['2026-08-18', 100],
      ['2026-08-17', 20],
    ]),
    4,
    TODAY,
  );
  const cell = (date: string) => grid.rows.flat().find((item) => item.localDate === date)?.bucket;

  assert.equal(cell('2026-08-18'), 4);
  assert.equal(cell('2026-08-17'), 1);
  assert.equal(bucketOpacity(0), 0);
  assert.ok(bucketOpacity(4) > bucketOpacity(1));
});

/**
 * A session with no minutes happened, and how long is unknown. It contributes a day but no time —
 * counting it as zero would be the same lie a zero macro would be.
 */
test('a session with no duration still marks the day', () => {
  const minutes = minutesByDate([
    { kind: 'session', payload: {}, recordedAt: '2026-08-18T09:00:00.000Z' },
  ]);
  assert.equal(minutes.get('2026-08-18'), 0);
  assert.equal(minutes.size, 1, 'the day disappeared because the duration was unknown');
});

test('minutes on the same day add up, and other kinds of entry are ignored', () => {
  const minutes = minutesByDate([
    { kind: 'session', payload: { minutes: 30 }, recordedAt: '2026-08-18T09:00:00.000Z' },
    { kind: 'session', payload: { minutes: 45 }, recordedAt: '2026-08-18T18:00:00.000Z' },
    { kind: 'meal', payload: { minutes: 999 }, recordedAt: '2026-08-18T13:00:00.000Z' },
  ]);

  assert.equal(minutes.get('2026-08-18'), 75);
});

test('the summary line counts sessions, and only mentions distance when there is some', () => {
  const withDistance = [
    { kind: 'session', payload: { distanceKm: 8.2 } },
    { kind: 'session', payload: { distanceKm: 5 } },
  ];
  assert.equal(lifetimeLine(withDistance), '2 sessions, 13 km');
  assert.equal(lifetimeLine([{ kind: 'session', payload: {} }]), '1 session');
  assert.equal(lifetimeLine([]), '');
});

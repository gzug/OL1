import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIN_DAYS_FOR_A_WEEKLY_CLAIM,
  WEEK_DAYS,
  weekOfEntries,
  weekStrip,
} from '../src/application/hubs/weekly';

const NOW = '2026-08-19T18:00:00.000Z';
const on = (day: string, kind = 'meal') => ({ kind, recordedAt: `2026-08-${day}T12:00:00.000Z` });

/**
 * PORTED RULE — Legacy `nutritionHomeBlock.ts`: "A sentence containing the words 'this week' needs a
 * week under it." Legacy released its weekly score at three logged meals, and three meals can all
 * sit on one day. This is the guard on that.
 */
test('a hub with three meals on one day may not talk about the week', () => {
  const sameDay = [
    { kind: 'meal', recordedAt: '2026-08-19T08:00:00.000Z' },
    { kind: 'meal', recordedAt: '2026-08-19T13:00:00.000Z' },
    { kind: 'meal', recordedAt: '2026-08-19T19:00:00.000Z' },
  ];
  const week = weekOfEntries(sameDay, 'meal', NOW);

  assert.equal(week.total, 3);
  assert.equal(week.days, 1);
  assert.equal(week.weeklyClaimAllowed, false, 'one enthusiastic day became "your week"');
});

test('four separate days is where a weekly claim starts', () => {
  const days = ['16', '17', '18', '19'].map((day) => on(day));
  assert.equal(days.length, MIN_DAYS_FOR_A_WEEKLY_CLAIM);
  assert.equal(weekOfEntries(days, 'meal', NOW).weeklyClaimAllowed, true);
  assert.equal(weekOfEntries(days.slice(1), 'meal', NOW).weeklyClaimAllowed, false);
});

test('a hub counts only its own kind of entry', () => {
  const mixed = [on('19', 'meal'), on('19', 'session'), on('18', 'session')];
  assert.equal(weekOfEntries(mixed, 'session', NOW).total, 2);
  assert.equal(weekOfEntries(mixed, 'meal', NOW).total, 1);
});

test('anything older than the window is not this week', () => {
  const old = [{ kind: 'meal', recordedAt: '2026-07-01T12:00:00.000Z' }];
  assert.equal(weekOfEntries(old, 'meal', NOW).total, 0);
});

test('the strip is seven days, oldest first', () => {
  const strip = weekStrip([on('19'), on('18')], 'meal', NOW);
  assert.equal(strip.length, WEEK_DAYS);
  assert.equal(strip[WEEK_DAYS - 1]?.fill, 1, 'today is not the last bar');
});

/**
 * Relative to the busiest day, not to a target — there is no target here, and inventing one to
 * divide by would be inventing the reading. The body figure's scale works the same way.
 */
test('the strip is scaled against the busiest day, not against a target', () => {
  const entries = [on('19'), on('19'), on('18')];
  const strip = weekStrip(entries, 'meal', NOW);

  assert.equal(strip[WEEK_DAYS - 1]?.fill, 1, 'the busiest day is not full');
  assert.equal(strip[WEEK_DAYS - 2]?.fill, 0.5);
});

test('a week with nothing in it is seven empty bars, not a divide by zero', () => {
  const strip = weekStrip([], 'meal', NOW);
  assert.equal(strip.length, WEEK_DAYS);
  for (const day of strip) assert.equal(day.fill, 0);
});

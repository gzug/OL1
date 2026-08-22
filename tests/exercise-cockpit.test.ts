import assert from 'node:assert/strict';
import test from 'node:test';

import { weekDayKeys, weekStrip } from '../src/application/hubs/weekly';
import type { HubEntry } from '../src/core/hubs';
import { exercisePeriods, quietDays } from '../src/ui/exercise/cockpit';
import { dayWords } from '../src/ui/hubs/entryWords';

/**
 * The first cockpit built from real entries. Every session below is invented.
 *
 * The window is anchored on a fixed `now` rather than the clock, because a test that moves with the
 * day is a test that fails on a Sunday — `check-frozen-dates.mjs` exists for the other half of that
 * lesson.
 */

const NOW = '2026-08-22T09:00:00.000Z';

const session = (
  day: string,
  activity: string,
  minutes: number,
  distanceKm?: number,
): HubEntry => ({
  hubId: 'exercise',
  id: `${day}-${activity}`,
  kind: 'session',
  payload: { activity, minutes, ...(distanceKm === undefined ? {} : { distanceKm }) },
  recordedAt: `${day}T08:00:00.000Z`,
  source: 'manual',
});

test('nothing logged draws nothing at all', () => {
  assert.deepEqual(exercisePeriods([], NOW), []);
  assert.deepEqual(exercisePeriods([session('2026-08-21', 'running', 0)], NOW), [], 'zero minutes is not a session');
});

test('the last session says what it was, how long, and how far', () => {
  const [last] = exercisePeriods(
    [session('2026-08-18', 'gym', 65), session('2026-08-21', 'running', 52, 9.4)],
    NOW,
  );

  assert.equal(last?.label, 'Last session');
  assert.deepEqual(last?.rows[0], { label: 'Running', value: '52m', when: 'yesterday' });
  assert.deepEqual(last?.rows[1], { label: 'Distance', value: '9.4 km', when: 'yesterday' });
});

/** A gym session has no distance, and a row of "—" would be worse than no row. */
test('a session with no distance gets no distance row', () => {
  const [last] = exercisePeriods([session('2026-08-22', 'gym', 65)], NOW);

  assert.equal(last?.rows.length, 1);
  assert.deepEqual(last?.rows[0], { label: 'Gym', value: '1h 5m', when: 'today' });
});

/**
 * The newest session ever, not the newest in the window. Somebody who has not trained in a
 * fortnight still wants to see what the last one was; an empty block reads as no history at all.
 */
test('a last session older than the window is still the last session', () => {
  const periods = exercisePeriods([session('2026-07-30', 'hiking', 180, 12.5)], NOW);

  assert.equal(periods.length, 1, 'and there is no week block, because the week has nothing in it');
  assert.deepEqual(periods[0]?.rows[0], { label: 'Hiking', value: '3h 0m', when: '3 weeks ago' });
});

test('the week adds up the time and names the longest', () => {
  const week = exercisePeriods(
    [
      session('2026-08-22', 'running', 52, 9.4),
      session('2026-08-21', 'gym', 65),
      session('2026-08-19', 'cycling', 95, 41.3),
    ],
    NOW,
  )[1];

  assert.equal(week?.label, 'Last seven days');
  assert.deepEqual(week?.rows[0], {
    label: 'Time moving',
    value: '3h 32m',
    when: 'across 3 sessions',
  });
  assert.deepEqual(week?.rows[1], {
    label: 'Longest',
    value: '1h 35m',
    when: 'Cycling, 3 days ago',
  });
});

/**
 * **The row the fixture got wrong.**
 *
 * It said "Rest days: 3". This app cannot tell a rest day from an unlogged one — the caption under
 * every strip it draws says exactly that — so the row reports what is true and stops.
 */
test('a quiet day is a day with nothing logged, never a rest day', () => {
  const entries = [session('2026-08-22', 'running', 52), session('2026-08-19', 'gym', 65)];
  const week = exercisePeriods(entries, NOW)[1];
  assert.ok(week !== undefined);

  assert.deepEqual(week.rows[week.rows.length - 1], {
    label: 'Days with nothing logged',
    value: '5',
    when: 'Sun, Mon, Tue, Thu, Fri',
  });
  assert.ok(!JSON.stringify(week).toLowerCase().includes('rest'));
});

test('a week with something on every day says so instead of showing a zero', () => {
  const entries = weekDayKeys(NOW).map((day) => session(day, 'walking', 30));
  const row = exercisePeriods(entries, NOW)[1]?.rows[2];

  assert.deepEqual(row, {
    label: 'Days with nothing logged',
    value: 'None',
    when: 'a session on all seven',
  });
});

/**
 * **The strip and the cockpit divide the week the same way**, because they divide it in the same
 * function. A row naming a quiet Wednesday over a bar with something on it is the failure this
 * repository keeps finding, and it is now impossible rather than merely unlikely.
 */
test('a quiet day is a day the strip drew empty', () => {
  const entries = [session('2026-08-22', 'running', 52), session('2026-08-18', 'gym', 65)];

  const empty = weekStrip(entries, 'session', NOW).filter((day) => day.fill === 0).length;

  assert.equal(quietDays(entries, NOW).length, empty);
});

test('the words for a day are words, not a chart axis', () => {
  assert.equal(dayWords('2026-08-22', NOW), 'today');
  assert.equal(dayWords('2026-08-21', NOW), 'yesterday');
  assert.equal(dayWords('2026-08-19', NOW), '3 days ago');
  assert.equal(dayWords('2026-08-16', NOW), '6 days ago');
  assert.equal(dayWords('2026-08-15', NOW), 'last week');
  assert.equal(dayWords('2026-07-30', NOW), '3 weeks ago');
});

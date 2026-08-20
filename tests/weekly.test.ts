import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIN_DAYS_FOR_A_WEEKLY_CLAIM,
  WEEK_DAYS,
  entriesThisWeek,
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
    { kind: 'meal', recordedAt: '2026-08-19T16:00:00.000Z' },
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

/**
 * An entry dated after "now" is not part of the last seven days, and is not counted.
 *
 * This was found by getting a test wrong: three meals were written at 08:00, 13:00 and 19:00 with
 * the clock at 18:00, and the count came back 2. The behaviour is right — a meal an hour in the
 * future has not been eaten — but it is silent, and a wrong device clock would make entries vanish
 * without explanation. Pinned here so the silence is a decision rather than an accident, and so the
 * day someone reports "my logs disappeared" this is the first place to look.
 */
test('an entry dated in the future is not part of this week', () => {
  const ahead = [{ kind: 'meal', recordedAt: '2026-08-20T09:00:00.000Z' }];
  const week = weekOfEntries(ahead, 'meal', NOW);

  assert.equal(week.total, 0);
  assert.equal(week.days, 0);
});

/**
 * The bug this function exists to prevent, found on the live site on 2026-08-20: three components on
 * the Nutrition screen each decided for themselves what "this week" meant, and printed "5 meals",
 * "5 meals logged on 3 days" and "From 6 meals across 4 days" — for the same six meals.
 *
 * One of them capped its read at five rows and counted the cap. Another had no window at all and was
 * scoring a meal dated an hour into the future. A screen that cannot agree with itself about how
 * many meals there were is worse than one showing nothing, because it makes every other number on
 * the page unbelievable too.
 */
test('everything that says "this week" counts the same entries', () => {
  const entries = [
    { kind: 'meal', recordedAt: '2026-08-17T08:00:00.000Z' },
    { kind: 'meal', recordedAt: '2026-08-17T13:00:00.000Z' },
    { kind: 'meal', recordedAt: '2026-08-18T12:00:00.000Z' },
    { kind: 'meal', recordedAt: '2026-08-19T09:00:00.000Z' },
    { kind: 'meal', recordedAt: '2026-08-19T19:00:00.000Z' },
    { kind: 'meal', recordedAt: '2026-08-20T08:00:00.000Z' }, // an hour into the future
    { kind: 'session', recordedAt: '2026-08-19T07:00:00.000Z' },
  ];
  const now = '2026-08-20T06:58:00.000Z';

  const week = entriesThisWeek(entries, 'meal', now);
  const counted = weekOfEntries(entries, 'meal', now);

  assert.equal(week.length, 5, 'the future-dated meal was counted');
  assert.equal(counted.total, week.length, 'the count and the selection disagree');
  assert.equal(counted.days, 3);

  // The strip is drawn from the same entries, so its filled bars cannot exceed them either.
  const filled = weekStrip(entries, 'meal', now).filter((day) => day.fill > 0).length;
  assert.equal(filled, counted.days, 'the strip shows more days than were counted');
});

test('a display limit never reaches the arithmetic', () => {
  const many = Array.from({ length: 9 }, (_, index) => ({
    kind: 'meal',
    recordedAt: `2026-08-19T0${index}:00:00.000Z`,
  }));
  assert.equal(entriesThisWeek(many, 'meal', '2026-08-20T06:58:00.000Z').length, 9);
});

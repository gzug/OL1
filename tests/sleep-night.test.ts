import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDuration } from '../src/application/format/metric';
import type { HubEntry } from '../src/core/hubs';
import { MIN_NIGHTS_FOR_A_TYPICAL, sleepPeriods } from '../src/ui/sleep/cockpit';
import {
  SLEEP_MINUTES,
  nightDate,
  nightEntryId,
  nightMinutes,
  nightPayload,
  nightProblem,
} from '../src/ui/sleep/night';

/**
 * The first way into the Sleep hub. **Every value here is invented.**
 *
 * The hub has been on the ring since the owner first drew it and its own cockpit said "Neither way
 * in is built yet" under two buttons that did nothing.
 */

const NOW = '2026-08-22T09:00:00.000Z';

const night = (day: string, minutes: number): HubEntry => ({
  hubId: 'sleep',
  id: `night-${day}`,
  kind: 'night',
  payload: { minutes },
  recordedAt: `${day}T07:00:00.000Z`,
  source: 'manual',
});

test('hours and minutes are asked separately and stored as one number', () => {
  assert.equal(nightMinutes('7', '30'), 450);
  assert.equal(nightMinutes('7', ''), 420, 'seven hours is a whole answer on its own');
  assert.equal(nightMinutes('', '45'), 45, 'and so is forty-five minutes');
  assert.equal(nightMinutes('7.5', ''), 450, 'somebody will type it as a decimal');
});

test('a night that is not one is refused, and says which way', () => {
  assert.equal(nightProblem('', ''), 'missing');
  assert.equal(nightProblem('abc', ''), 'notANumber');
  assert.equal(nightProblem('-2', ''), 'outside');
  assert.equal(nightProblem('', '5'), 'outside', 'five minutes is not a night');
  assert.equal(nightProblem('20', ''), 'outside', 'nor is twenty hours');
  assert.equal(nightProblem('16', ''), null, 'the boundary is allowed');
  assert.equal(nightProblem('', String(SLEEP_MINUTES.min)), null);
});

/**
 * **A bad night is still a night and this must not argue with somebody who had one.** The same
 * posture `session.ts` takes towards a twelve-hour ultra.
 */
test('a short night is accepted, not corrected', () => {
  assert.equal(nightProblem('3', '10'), null);
  assert.equal(nightMinutes('3', '10'), 190);
});

/**
 * The morning you woke, not the evening you went to bed. A night spans two dates and one of them
 * has to be the entry's — waking is the end of it, and how every tracker files it.
 */
test('a night belongs to the morning it ended', () => {
  assert.equal(nightDate('last', NOW), '2026-08-22');
  assert.equal(nightDate('before', NOW), '2026-08-21');
});

/**
 * **Logging the same night twice replaces it.** `dailyId` for the reason it exists: walking the
 * first run twice used to weigh somebody twice, because the entry carried a fresh id each time.
 */
test('one night has one id, however many times it is answered', () => {
  assert.equal(nightEntryId('last', NOW), nightEntryId('last', '2026-08-22T23:00:00.000Z'));
  assert.notEqual(nightEntryId('last', NOW), nightEntryId('before', NOW));
});

test('a blank note is absent rather than empty', () => {
  assert.deepEqual(nightPayload(450, '   '), { minutes: 450 });
  assert.deepEqual(nightPayload(450, ' woke at four '), { minutes: 450, note: 'woke at four' });
});

test('no nights draws nothing at all', () => {
  assert.deepEqual(sleepPeriods([], NOW), []);
  assert.deepEqual(sleepPeriods([{ ...night('2026-08-22', 450), kind: 'note' }], NOW), []);
  assert.deepEqual(sleepPeriods([night('2026-08-22', 0)], NOW), [], 'zero is not a night');
});

/**
 * **Two nights is not a typical night.** One against itself is not an average and two is a pair —
 * the same discipline `WhatChanged` keeps about two panels.
 */
test('a typical night needs enough nights to be typical', () => {
  const two = sleepPeriods([night('2026-08-22', 450), night('2026-08-21', 400)], NOW);
  assert.equal(two.length, 1, 'the last night still shows; the week does not');
  assert.equal(two[0]?.label, 'Last night logged');

  const enough = sleepPeriods(
    Array.from({ length: MIN_NIGHTS_FOR_A_TYPICAL }, (_, index) =>
      night(`2026-08-2${2 - index}`, 420 + index * 30),
    ),
    NOW,
  );
  assert.equal(enough.length, 2);
});

test('the week reports the typical, the shortest and the longest', () => {
  const week = sleepPeriods(
    [night('2026-08-22', 450), night('2026-08-21', 380), night('2026-08-19', 505)],
    NOW,
  )[1];

  assert.equal(week?.label, 'Last seven nights');
  assert.deepEqual(week?.rows[0], {
    label: 'Typical night',
    value: '7h 25m',
    when: 'across 3 nights',
  });
  assert.deepEqual(week?.rows[1], { label: 'Shortest', value: '6h 20m', when: 'yesterday' });
  assert.deepEqual(week?.rows[2], { label: 'Longest', value: '8h 25m', when: '3 days ago' });
});

/** The last night logged is the last one, however long ago — the same rule as the last session. */
test('a last night older than the window is still the last night', () => {
  const [block] = sleepPeriods([night('2026-08-01', 465)], NOW);

  assert.deepEqual(block?.rows[0], {
    label: 'Time asleep',
    value: '7h 45m',
    when: '3 weeks ago',
  });
});

/**
 * **Nothing writes a duration by hand.** The fixture this replaced wrote `7h 05m` and `8h 04m`,
 * which `formatDuration` never produces; two of its four agreed with it by accident.
 */
test('every duration on the block is one formatDuration would write', () => {
  const periods = sleepPeriods(
    [night('2026-08-22', 451), night('2026-08-21', 383), night('2026-08-20', 505)],
    NOW,
  );

  for (const [text, hours, minutes] of JSON.stringify(periods).matchAll(/(\d+)h (\d+)m/g)) {
    assert.equal(text, formatDuration(Number(hours) * 60 + Number(minutes)));
  }
});

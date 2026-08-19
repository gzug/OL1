import assert from 'node:assert/strict';
import test from 'node:test';

import { SESSION_MUSCLES } from '../src/application/twin/muscleLoad';
import {
  DISTANCE_KM,
  MINUTES,
  SESSION_TYPES,
  distanceProblem,
  minutesProblem,
  sessionPayload,
} from '../src/ui/exercise/session';

/**
 * The rule this file exists to hold: **what you can log is what the figure can place.** Offering a
 * type the body figure has never heard of produces a session that silently marks nothing, which is
 * worse than not offering it — the person did the work and the app quietly loses it.
 *
 * "Something else" is the deliberate exception, and it is honest about itself: the figure reports it
 * as a session it cannot place rather than guessing at muscles.
 */
test('every session type the flow offers is one the body figure can place', () => {
  for (const option of SESSION_TYPES) {
    if (option.id === 'other') continue;
    assert.ok(
      SESSION_MUSCLES[option.id] !== undefined,
      `"${option.id}" can be logged but reaches no muscles — it would mark nothing`,
    );
  }
});

test('"something else" is offered, and is deliberately unplaceable', () => {
  assert.ok(SESSION_TYPES.some((option) => option.id === 'other'));
  assert.equal(SESSION_MUSCLES.other, undefined);
});

test('how long it took is the one thing required', () => {
  assert.equal(minutesProblem(''), 'minutesMissing');
  assert.equal(minutesProblem('45'), null);
  assert.equal(minutesProblem('half an hour'), 'notANumber');
  assert.equal(minutesProblem(String(MINUTES.max + 1)), 'minutesOutside');
  assert.equal(minutesProblem('0'), 'minutesOutside');
});

/** An ultra is a real thing. The ranges are generous so this never argues with someone who did one. */
test('a long session is allowed, an impossible one is not', () => {
  assert.equal(minutesProblem('600'), null, 'a ten-hour day is a real session');
  assert.equal(distanceProblem('160'), null, 'a hundred-mile race is a real session');
  assert.equal(distanceProblem(String(DISTANCE_KM.max + 1)), 'distanceOutside');
});

test('distance is optional, and blank is not a problem', () => {
  assert.equal(distanceProblem(''), null);
  assert.equal(distanceProblem('   '), null);
});

/**
 * The same rule meals and panels follow: a blank is absent, never zero. A gym session did not cover
 * zero kilometres — nobody measured it, and a zero would average into "your distance is falling"
 * without anybody having claimed that.
 */
test('a session with no distance stores no distance, not a zero', () => {
  const payload = sessionPayload('gym', '50', '', '');
  assert.equal('distanceKm' in payload, false);
  assert.equal(payload.minutes, 50);
  assert.equal(payload.activity, 'gym');
});

test('an unusable distance is dropped rather than stored', () => {
  assert.equal('distanceKm' in sessionPayload('running', '30', 'about 5', ''), false);
  assert.equal('distanceKm' in sessionPayload('running', '30', '9999', ''), false);
});

test('a note is kept when there is one, and absent when there is not', () => {
  assert.equal(sessionPayload('running', '30', '5', '  felt heavy  ').note, 'felt heavy');
  assert.equal('note' in sessionPayload('running', '30', '5', '  '), false);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_SESSION_WEIGHT,
  REFERENCE_MINUTES,
  WINDOW_DAYS,
  effort,
  freshness,
  isMuscle,
  muscleLoad,
} from '../src/application/twin/muscleLoad';

const NOW = '2026-08-19T12:00:00.000Z';
const daysAgo = (days: number) =>
  new Date(new Date(NOW).getTime() - days * 86_400_000).toISOString();

/**
 * The rules that keep the figure a reading rather than a claim. Every one of these is a refusal,
 * and a refusal is exactly the kind of thing that gets quietly optimised away later.
 */

test('nothing logged means nothing marked', () => {
  const load = muscleLoad([], NOW);
  assert.deepEqual(load.loads, {});
  assert.equal(load.counted, 0);
});

test('a run marks the legs and leaves the arms alone', () => {
  const { loads } = muscleLoad([{ at: daysAgo(0), kind: 'running' }], NOW);

  assert.ok(loads.calves !== undefined, 'a run did not reach the calves');
  assert.ok(loads.quadriceps !== undefined);
  assert.equal(loads.biceps, undefined, 'a run marked the biceps');
  assert.equal(loads.chest, undefined);
});

/**
 * The one the owner would notice: a session type nobody has mapped is COUNTED and said out loud,
 * never spread across "probably the legs". Inventing the reading is the failure mode here.
 */
test('a session nobody has mapped marks nothing, and is reported', () => {
  const load = muscleLoad([{ at: daysAgo(1), kind: 'kitesurfing' }], NOW);

  assert.deepEqual(load.loads, {});
  assert.equal(load.unplaced, 1);
  assert.equal(load.counted, 0);
});

test('load fades with time rather than piling up', () => {
  assert.equal(freshness(0), 1);
  assert.ok(freshness(3) < freshness(1));
  assert.equal(freshness(WINDOW_DAYS), 0, 'a session at the edge of the window still counts');
  assert.equal(freshness(30), 0);
});

test('a session older than the window is not on the figure at all', () => {
  const load = muscleLoad([{ at: daysAgo(30), kind: 'running' }], NOW);
  assert.deepEqual(load.loads, {});
  assert.equal(load.unplaced, 0, 'an out-of-window session was reported as unplaceable');
});

/**
 * The scale is relative to the busiest muscle of the week, not to an absolute number of sessions.
 * Absolute thresholds mean someone who trains twice a week never sees a warm colour and someone who
 * trains daily sees everything at the top — in both cases the figure stops saying anything.
 */
test('the scale is relative: the most-worked muscle always tops out', () => {
  const light = muscleLoad([{ at: daysAgo(0), kind: 'running' }], NOW);
  const heavy = muscleLoad(
    [0, 1, 2, 3, 4].map((day) => ({ at: daysAgo(day), kind: 'running' })),
    NOW,
  );

  assert.equal(light.loads.calves, 3);
  assert.equal(heavy.loads.calves, 3);
});

test('a muscle worked less than the busiest one sits below it', () => {
  const { loads } = muscleLoad([{ at: daysAgo(0), kind: 'running' }], NOW);
  assert.ok((loads.calves ?? 0) > (loads.tibialis ?? 0), 'every muscle in a run scored the same');
});

/**
 * Tapping a muscle beats the mapping. The person was there and this file was not — it is also the
 * only way to correct a session the app could not see.
 */
test('muscles marked by hand override what the session type would have said', () => {
  const { loads } = muscleLoad(
    [{ at: daysAgo(0), kind: 'running', muscles: ['biceps'] }],
    NOW,
  );

  assert.equal(loads.biceps, 3);
  assert.equal(loads.calves, undefined, 'the session type overrode what the person marked');
});

test('the scale never goes past its third step, however much is logged', () => {
  const { loads } = muscleLoad(
    Array.from({ length: 40 }, () => ({ at: NOW, kind: 'running' })),
    NOW,
  );
  for (const value of Object.values(loads)) assert.ok(value <= 3);
});

/**
 * The figure draws more than muscles — head, hair, neck, hands, feet, ankles, knees. Tapping one of
 * those must record nothing: "I worked my hair" is not a reading anybody wants back.
 */
test('a body part that is not a muscle cannot be marked as worked', () => {
  for (const muscle of ['calves', 'chest', 'upper-back']) assert.ok(isMuscle(muscle));
  for (const part of ['head', 'hair', 'neck', 'hands', 'feet', 'ankles', 'knees']) {
    assert.equal(isMuscle(part), false, `"${part}" is drawn on the figure but is not a muscle`);
  }
  assert.equal(isMuscle(undefined), false);
});

/**
 * How long a session took has to reach the figure.
 *
 * It did not, until the owner asked what would actually change the colour if he logged a run. The
 * minutes were on every session and thrown away here, so a three-kilometre jog and a
 * twenty-five-kilometre run painted an identical body.
 */
test('a longer session marks harder than a short one', () => {
  const now = '2026-08-20T18:00:00.000Z';
  const short = muscleLoad([{ at: now, kind: 'running', minutes: 15 }], now);
  const long = muscleLoad([{ at: now, kind: 'running', minutes: 90 }], now);

  // Relative shading inside one session is unchanged — it is the same activity either way.
  assert.deepEqual(Object.keys(short.loads).sort(), Object.keys(long.loads).sort());

  // But against a fixed other session, the long one now wins the scale.
  const gym = { at: now, kind: 'gym', minutes: 45 };
  const withShort = muscleLoad([gym, { at: now, kind: 'running', minutes: 15 }], now);
  const withLong = muscleLoad([gym, { at: now, kind: 'running', minutes: 120 }], now);

  assert.ok(
    (withShort.loads.chest as number) > (withShort.loads.calves as number),
    'a 45-minute gym session should out-mark a 15-minute run',
  );
  assert.ok(
    (withLong.loads.calves as number) > (withLong.loads.chest as number),
    'a two-hour run should out-mark a 45-minute gym session',
  );
});

/** The ordinary session is worth one unit, so nobody's existing figure shifts for no reason. */
test('the reference session is worth exactly one, and the cap really caps', () => {
  assert.equal(effort(REFERENCE_MINUTES), 1);
  assert.equal(effort(REFERENCE_MINUTES * 2), 2);
  assert.equal(effort(REFERENCE_MINUTES * 10), MAX_SESSION_WEIGHT, 'an ultra must not flatten a week');
});

/**
 * A tapped muscle has no duration, and inventing one would be worse than either extreme. It counts
 * as an ordinary session: the person was there, and how long it took is something nobody wrote down.
 */
test('a hand-marked muscle, and a session with no usable minutes, count as one ordinary session', () => {
  for (const minutes of [undefined, 0, -30, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(effort(minutes as number | undefined), 1, `minutes ${String(minutes)} must fall back to 1`);
  }
});

/** Duration scales a session; it never revives one that has aged out of the window. */
test('a very long session still disappears after the window', () => {
  const gone = muscleLoad(
    [{ at: '2026-08-01T09:00:00.000Z', kind: 'running', minutes: 300 }],
    '2026-08-20T09:00:00.000Z',
  );

  assert.deepEqual(gone.loads, {});
  assert.equal(gone.counted, 0);
});

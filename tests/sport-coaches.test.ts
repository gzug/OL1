import assert from 'node:assert/strict';
import test from 'node:test';

import { sportCoachesFor, sportsLogged } from '../src/application/exercise/sportCoaches';
import type { HubEntry } from '../src/core/hubs';

/**
 * Sports are coaches, not hubs — the owner's call on 2026-08-21.
 *
 * They used to ship as five hubs inside Exercise which never received a single session, because
 * every session goes to `exercise` with the sport as a field. What naming a sport earns you is its
 * voice, and that is what these read.
 */

function entry(kind: string, payload: Record<string, unknown>, at: string): HubEntry {
  return { hubId: 'exercise', id: `${kind}-${at}`, kind, payload, recordedAt: at, source: 'manual' };
}

test('the sports somebody named become their coaches, oldest first', () => {
  const found = sportCoachesFor([
    entry('sport', { coachId: 'golf', label: 'Golf' }, '2026-08-02T00:00:00.000Z'),
    entry('session', { activity: 'running' }, '2026-08-03T00:00:00.000Z'),
    entry('sport', { coachId: 'running', label: 'Running' }, '2026-08-01T00:00:00.000Z'),
  ]);

  assert.deepEqual(
    found.map((sport) => sport.coachId),
    ['running', 'golf'],
  );
});

/**
 * Naming a sport twice is exactly what a settings screen produces when somebody re-saves their
 * answers. Two Golf Coaches in a drawer is the kind of thing nobody reports and everybody notices.
 */
test('naming a sport twice gives one coach', () => {
  const twice = sportCoachesFor([
    entry('sport', { coachId: 'golf', label: 'Golf' }, '2026-08-01T00:00:00.000Z'),
    entry('sport', { coachId: 'golf', label: 'Golf' }, '2026-08-09T00:00:00.000Z'),
  ]);

  assert.equal(twice.length, 1);
});

test('an entry that is not a sport, or has no coach, is not one', () => {
  const messy = sportCoachesFor([
    entry('session', { activity: 'running' }, '2026-08-01T00:00:00.000Z'),
    entry('sport', { label: 'Golf' }, '2026-08-02T00:00:00.000Z'),
    entry('sport', { coachId: '', label: 'Nothing' }, '2026-08-03T00:00:00.000Z'),
  ]);

  assert.deepEqual(messy, []);
});

/** A sport with no label falls back to its coach id rather than rendering blank. */
test('a sport with no label still has a name', () => {
  const bare = sportCoachesFor([entry('sport', { coachId: 'swimming' }, '2026-08-01T00:00:00.000Z')]);

  assert.equal(bare[0]?.label, 'swimming');
});

/**
 * Importing years of Strava history brings in swims from somebody who never ticked Swimming.
 * Offering a coach for a sport they demonstrably do beats waiting to be told.
 */
test('what was logged is readable separately from what was named', () => {
  const logged = sportsLogged([
    entry('session', { activity: 'swimming' }, '2026-08-01T00:00:00.000Z'),
    entry('session', { activity: 'running' }, '2026-08-02T00:00:00.000Z'),
    entry('session', { activity: 'running' }, '2026-08-03T00:00:00.000Z'),
    entry('session', { activity: 'other' }, '2026-08-04T00:00:00.000Z'),
    entry('sport', { coachId: 'golf' }, '2026-08-05T00:00:00.000Z'),
  ]);

  assert.deepEqual(logged, ['running', 'swimming'], 'other is not a sport, and a named one is not logged');
});

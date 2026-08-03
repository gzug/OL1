import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COACHES,
  SEED_HUBS,
  childHubs,
  coachForHub,
  findCoach,
  findHub,
  orbitHubs,
} from '../src/ui/hubs/catalog';

/**
 * Hub ids stopped being a union type when hubs became data, so the compiler no longer catches a hub
 * pointing at a coach that does not exist. These tests are what replaces that, and they are the
 * reason the union could be given up safely.
 */

test('every hub resolves to a coach', () => {
  for (const hub of SEED_HUBS) {
    assert.ok(
      findCoach(hub.coachId) !== undefined,
      `hub "${hub.id}" points at coach "${hub.coachId}", which does not exist`,
    );
  }
});

test('hub ids and coach ids are each unique', () => {
  const hubIds = SEED_HUBS.map((hub) => hub.id);
  const coachIds = COACHES.map((coach) => coach.id);
  assert.equal(new Set(hubIds).size, hubIds.length, 'two hubs share an id');
  assert.equal(new Set(coachIds).size, coachIds.length, 'two coaches share an id');
});

test('every nested hub names a parent that exists, and no parent is itself nested', () => {
  for (const hub of SEED_HUBS) {
    if (hub.parentId === undefined) continue;
    const parent = findHub(hub.parentId);
    assert.ok(parent !== undefined, `hub "${hub.id}" names a parent that does not exist`);
    assert.equal(
      parent?.parentId,
      undefined,
      `hub "${hub.id}" nests under "${parent?.id}", which is itself nested — the ring only draws one level`,
    );
  }
});

/**
 * Ring order is load-bearing: `src/ui/mockup/geometry.ts` places hub `index` at `index * 60`
 * degrees, so this sequence is what decides where each hub sits on screen. Labs next to the drift
 * number is deliberate. If this assertion is ever updated, the orbit moved.
 */
test('the orbit is the six built-in hubs, in ring order', () => {
  assert.deepEqual(
    orbitHubs().map((hub) => hub.id),
    ['activity', 'nutrition', 'body', 'resilience', 'labs', 'sleep'],
  );
});

test('exercise types live inside Activity, not on the ring', () => {
  const inside = childHubs('activity').map((hub) => hub.id);
  assert.deepEqual(inside, ['running', 'gym', 'cycling', 'swimming', 'golf']);
  for (const id of inside) {
    assert.ok(
      !orbitHubs().some((hub) => hub.id === id),
      `"${id}" is on the ring; the orbit would claim eleven domains instead of six`,
    );
  }
});

test('every hub the orbit draws has a coach with a focus line', () => {
  for (const hub of orbitHubs()) {
    const coach = coachForHub(hub.id);
    assert.ok(coach !== undefined, `hub "${hub.id}" has no coach`);
    assert.ok((coach?.focus.length ?? 0) > 0, `coach "${coach?.id}" has no focus line`);
  }
});

/**
 * An unknown id has to stay undefined rather than fall back to a default coach. Hubs are
 * user-creatable, so an id that resolves to nothing is an ordinary state — and a hub silently
 * answered by the wrong coach is worse than one that admits it has none.
 */
test('an unknown hub resolves to nothing, never to a default', () => {
  assert.equal(findHub('not-a-hub'), undefined);
  assert.equal(coachForHub('not-a-hub'), undefined);
  assert.equal(findCoach('not-a-coach'), undefined);
});

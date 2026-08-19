import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COACHES,
  SEED_HUBS,
  childHubs,
  coachForHub,
  findCoach,
  findHub,
  isDomainHub,
  orbitHubs,
} from '../src/ui/hubs/catalog';
import { hubStateFor } from '../src/ui/hubs/states';

/**
 * Hub ids stopped being a union type when hubs became data, so the compiler no longer catches a hub
 * pointing at a coach that does not exist. These tests are what replaces that, and they are the
 * reason the union could be given up safely.
 */

test('every domain hub resolves to a coach, and only the Open Table has none', () => {
  for (const hub of SEED_HUBS) {
    if (!isDomainHub(hub)) {
      // The Open Table reaches every coach, so having one of its own would make it a seventh
      // domain competing with the six.
      assert.equal(hub.coachId, undefined, `"${hub.id}" is not a domain hub but claims a coach`);
      continue;
    }
    assert.ok(
      hub.coachId !== undefined && findCoach(hub.coachId) !== undefined,
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
 * Ring order is load-bearing: `src/ui/mockup/geometry.ts` places hub `index` at a fixed angle, so
 * this sequence is what decides where each hub sits on screen. If this assertion is ever updated,
 * the orbit moved — which it did on 2026-08-19, when the owner re-drew it.
 */
test('the orbit is the six built-in places, in ring order', () => {
  assert.deepEqual(
    orbitHubs().map((hub) => hub.id),
    ['exercise', 'nutrition', 'medical', 'resilience', 'sleep', 'open-table'],
  );
});

test('exercise types live inside Exercise, not on the ring', () => {
  const inside = childHubs('exercise').map((hub) => hub.id);
  assert.deepEqual(inside, ['running', 'gym', 'cycling', 'swimming', 'golf']);
  for (const id of inside) {
    assert.ok(
      !orbitHubs().some((hub) => hub.id === id),
      `"${id}" is on the ring; Running and Gym were kept inside Exercise deliberately`,
    );
  }
});

/**
 * Labs moved inside Medical condition on 2026-08-19 and everything built for panels still routes
 * through the hub id `labs` — `/add-panel`, the verification gate, and the PhenoAge feed. If this
 * fails, those are reaching for a hub that is no longer where they think it is.
 */
test('Labs lives inside Medical condition, keeping its id and its coach', () => {
  assert.deepEqual(childHubs('medical').map((hub) => hub.id), ['labs']);
  assert.ok(!orbitHubs().some((hub) => hub.id === 'labs'), 'Labs is back on the ring');
  assert.equal(coachForHub('labs')?.id, 'longevity');
  assert.ok(hubStateFor('labs') !== undefined, 'Labs lost its cockpit in the move');
});

/**
 * A hub circle is 64 pixels across and its label is one line, so about ten characters is the whole
 * budget. "Medical condition" is seventeen and truncates to "Medical con…", which reads as a bug —
 * hence `ringLabel`. This is the guard that makes the next long hub name fail here rather than on
 * the owner's screen.
 */
test('no label on the ring is too long for its circle', () => {
  for (const hub of orbitHubs()) {
    const drawn = hub.ringLabel ?? hub.label;
    assert.ok(
      drawn.length <= 10,
      `"${hub.id}" draws "${drawn}" (${drawn.length} chars) on the ring — give it a ringLabel`,
    );
  }
});

/** The retired hubs. Kept as an assertion so neither quietly comes back with a rebase. */
test('Body and Activity are gone, ids included', () => {
  for (const id of ['body', 'activity']) {
    assert.equal(findHub(id), undefined, `"${id}" is back in the catalog`);
  }
});

test('every domain hub the orbit draws has a coach with a focus line', () => {
  for (const hub of orbitHubs().filter(isDomainHub)) {
    const coach = coachForHub(hub.id);
    assert.ok(coach !== undefined, `hub "${hub.id}" has no coach`);
    assert.ok((coach?.focus.length ?? 0) > 0, `coach "${coach?.id}" has no focus line`);
  }
});

/**
 * The Open Table is on the ring but is not a hub: no coach, no cockpit, and tapping it goes to the
 * chat surface rather than a hub screen. If it ever grows either, it has become a seventh domain.
 */
test('the Open Table has no coach and no cockpit', () => {
  const table = findHub('open-table');
  assert.ok(table !== undefined, 'the Open Table is missing from the ring');
  assert.equal(table?.role, 'table');
  assert.equal(coachForHub('open-table'), undefined);
  assert.equal(hubStateFor('open-table'), undefined, 'the Open Table must not have a cockpit');
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

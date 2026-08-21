import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COACHES,
  SEED_HUBS,
  childHubs,
  coachForHub,
  findCoach,
  findHub,
  hubForCoach,
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

/**
 * **A label is what a person reads. An id is what their data is attached to.**
 *
 * `hub_entry.hub_id` is the only link between a stored condition, medication or blood panel and the
 * hub it belongs to, and migration 4 deliberately declares no foreign key — so renaming a hub id
 * fails no build, no test and no migration. It silently orphans everything a person ever saved, and
 * they open the hub to find it empty.
 *
 * The two are allowed to disagree, and twice now they have: Labs kept its id when it moved inside
 * another hub on 2026-08-19, and Health record kept `medical` when it was renamed on 2026-08-21.
 * This test is what makes the third time safe.
 */
test('the ids that already have stored data behind them never move', () => {
  const frozen: Readonly<Record<string, string>> = {
    /** Renamed from "Medical condition" on 2026-08-21. Its id did not follow, and must not. */
    medical: 'Health record',
    /** Renamed from Activity BEFORE anything was stored, which is why that id was free to move. */
    exercise: 'Exercise',
    labs: 'Labs',
    nutrition: 'Nutrition',
    'open-table': 'Open Table',
    resilience: 'Resilience',
    sleep: 'Sleep',
  };

  for (const [id, label] of Object.entries(frozen)) {
    const hub = SEED_HUBS.find((seeded) => seeded.id === id);
    assert.ok(hub !== undefined, `the hub id "${id}" has vanished — every entry stored under it is now orphaned`);
    assert.equal(hub?.label, label, `"${id}" is labelled differently; if that is deliberate, update this test and NOT the id`);
  }
});

/**
 * The rename has to be complete on screen, or two names for one hub are in front of the same
 * person on two different screens.
 */
test('nothing user-facing still calls it Medical', () => {
  const medical = SEED_HUBS.find((hub) => hub.id === 'medical');

  assert.ok(!medical?.label.includes('Medical'));
  assert.ok(!(medical?.ringLabel ?? '').includes('Medical'));

  const coach = COACHES.find((entry) => entry.id === 'medical');
  assert.ok(
    !coach?.name.includes('Medical'),
    'a coach named "Medical" implies the clinical authority the hub was renamed to disclaim',
  );
});

/**
 * `hubForCoach` and `coachForHub` must stay exact reverses.
 *
 * This is what lets a hub's brief follow its coach into a conversation: the chat surface is reached
 * by coaches and a thread id, never by hub, so the hub is derived from the coach. If the two ever
 * disagree, a brief written for one hub reaches a coach from another — which is worse than no brief
 * at all.
 */
test('every hub with a coach can be found back from that coach', () => {
  for (const hub of SEED_HUBS) {
    if (hub.coachId === undefined) continue;

    const back = hubForCoach(hub.coachId);
    assert.equal(back?.id, hub.id, `${hub.label}'s coach leads to ${back?.label ?? 'nothing'}`);
  }
});

/** A coach nothing owns leads nowhere, rather than to the first hub that happens to match. */
test('an unknown coach belongs to no hub', () => {
  assert.equal(hubForCoach('not-a-coach'), undefined);
  assert.equal(hubForCoach(''), undefined);
});

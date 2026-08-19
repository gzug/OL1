import assert from 'node:assert/strict';
import test from 'node:test';

import { SEED_HUBS, orbitHubs, ringPlaceCount } from '../src/ui/hubs/catalog';
import { coachFor, mergeHubs, toDefinition } from '../src/ui/hubs/mergeHubs';

const made = (id: string, createdAt: string) => ({
  coachId: id,
  createdAt,
  id,
  label: id[0].toUpperCase() + id.slice(1),
});

test('with nothing stored, the ring is exactly what ships', () => {
  assert.deepEqual(mergeHubs([]), SEED_HUBS);
});

/**
 * Ring order is load-bearing geometry. A hub that changed position when another was added would
 * make the orbit feel unstable, so the seeded ones keep their places and new ones land after them.
 */
test('a hub the user made joins the end of the ring, oldest first', () => {
  const merged = mergeHubs([made('reading', '2026-02-01T00:00:00Z'), made('garden', '2026-01-01T00:00:00Z')]);
  const ring = orbitHubs(merged).map((hub) => hub.id);

  assert.deepEqual(ring.slice(0, orbitHubs(SEED_HUBS).length), orbitHubs(SEED_HUBS).map((hub) => hub.id));
  assert.deepEqual(ring.slice(-2), ['garden', 'reading']);
});

test('the + is still the last place, however many hubs there are', () => {
  const merged = mergeHubs([made('reading', '2026-02-01T00:00:00Z')]);
  assert.equal(ringPlaceCount(merged), orbitHubs(merged).length + 1);
  assert.equal(ringPlaceCount(merged), ringPlaceCount() + 1);
});

/**
 * `newHub.ts` refuses a colliding name at creation time, so this is the second line rather than the
 * first — it matters when the SEED data grows a hub whose id someone already used. The shipped hub
 * has a cockpit and a screen behind it; a stored row must never shadow one.
 */
test('a stored hub never shadows a hub that ships', () => {
  const merged = mergeHubs([made('sleep', '2026-02-01T00:00:00Z')]);

  assert.equal(merged.filter((hub) => hub.id === 'sleep').length, 1);
  assert.equal(merged.find((hub) => hub.id === 'sleep')?.origin, 'builtIn');
});

test('a hub the user made says so, and brings its own coach', () => {
  const hub = toDefinition(made('reading', '2026-02-01T00:00:00Z'));

  assert.equal(hub.origin, 'user');
  assert.equal(coachFor(hub)?.name, 'Reading Coach');
  assert.ok((coachFor(hub)?.focus.length ?? 0) > 0, 'a coach with no focus line cannot say what it is for');
});

/**
 * A seeded hub's coach is the catalog's, with a focus line somebody wrote. Generating one for it
 * would quietly replace eleven hand-written lines with "Whatever you keep in Sleep."
 */
test('a seeded hub does not get a generated coach', () => {
  const sleep = SEED_HUBS.find((hub) => hub.id === 'sleep');
  assert.ok(sleep !== undefined);
  assert.equal(coachFor(sleep), undefined);
});

test('a hub made inside another stays inside it', () => {
  const merged = mergeHubs([{ ...made('climbing', '2026-02-01T00:00:00Z'), parentId: 'exercise' }]);

  assert.equal(merged.find((hub) => hub.id === 'climbing')?.parentId, 'exercise');
  assert.ok(
    !orbitHubs(merged).some((hub) => hub.id === 'climbing'),
    'a hub made inside Exercise appeared on the ring',
  );
});

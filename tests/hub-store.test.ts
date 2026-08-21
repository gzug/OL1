import assert from 'node:assert/strict';
import test from 'node:test';

import { createHubs } from '../src/application/hubs/hubs';
import { createMemoryHubStore } from '../src/infrastructure/hubs/hubStore';

/**
 * These run against the in-memory store, which is the same port the SQLite and `localStorage`
 * implementations satisfy. That is the point of the three-file arrangement `chatStore` established:
 * the assertions cover the shape of the port rather than a mock written to agree with them.
 */

test('a hub survives being created twice, and keeps the time it was first made', async () => {
  const store = createMemoryHubStore();
  await store.createHub({ createdAt: '2026-01-01T00:00:00.000Z', id: 'reading', label: 'Reading' });
  await store.createHub({ createdAt: '2026-06-01T00:00:00.000Z', id: 'reading', label: 'Renamed' });

  const stored = await store.listHubs();
  assert.equal(stored.length, 1, 'creating twice made two hubs');
  assert.equal(stored[0]?.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(stored[0]?.label, 'Reading', 'the second create overwrote the first');
});

/**
 * Newest first, and the cap applies AFTER the sort. Legacy's chat store shipped the other way round
 * and gave back the oldest 200 turns of a long conversation — the screen showed months-old messages
 * and none of today's. Same mistake, same cost, one table over.
 */
test('entries come back newest first, and a limit takes the newest ones', async () => {
  const store = createMemoryHubStore();
  const at = (day: string) => `2026-03-${day}T12:00:00.000Z`;

  for (const day of ['01', '05', '03']) {
    await store.addEntry({
      hubId: 'nutrition',
      id: `entry-${day}`,
      kind: 'meal',
      payload: {},
      recordedAt: at(day),
      source: 'manual',
    });
  }

  assert.deepEqual(
    (await store.listEntries('nutrition')).map((entry) => entry.recordedAt),
    [at('05'), at('03'), at('01')],
  );
  assert.deepEqual(
    (await store.listEntries('nutrition', 2)).map((entry) => entry.recordedAt),
    [at('05'), at('03')],
  );
});

test('one hub never sees another hub’s entries', async () => {
  const store = createMemoryHubStore();
  await store.addEntry({
    hubId: 'nutrition',
    id: 'a',
    kind: 'meal',
    payload: {},
    recordedAt: '2026-03-01T12:00:00.000Z',
    source: 'manual',
  });

  assert.deepEqual(await store.listEntries('exercise'), []);
});

/**
 * `recordedAt` is when the thing HAPPENED, and the default is only a default. A meal logged at
 * midnight for lunch belongs to lunchtime; a cockpit ordering by write time would say otherwise.
 */
test('an entry can be recorded at a time other than now', async () => {
  const hubs = createHubs(createMemoryHubStore());
  const lunch = '2026-03-01T12:30:00.000Z';

  const entry = await hubs.add('nutrition', 'meal', { note: 'soup' }, { recordedAt: lunch, source: 'chat' });

  assert.equal(entry.recordedAt, lunch);
  assert.equal(entry.source, 'chat');
  assert.deepEqual(entry.payload, { note: 'soup' });
});

test('an entry with no stated source says it was entered by hand', async () => {
  const hubs = createHubs(createMemoryHubStore());
  const entry = await hubs.add('exercise', 'session', {});
  assert.equal(entry.source, 'manual');
});

test('two entries made in the same millisecond are still two entries', async () => {
  const hubs = createHubs(createMemoryHubStore());
  const first = await hubs.add('exercise', 'session', {});
  const second = await hubs.add('exercise', 'session', {});

  assert.notEqual(first.id, second.id);
  assert.equal((await hubs.entries('exercise')).length, 2);
});

/**
 * **All three stores must replace by id, or the tests run against behaviour the app does not have.**
 *
 * Native does `INSERT OR REPLACE`; web filters the id out and appends. The in-memory store — the one
 * every test here uses, and the one `tsc` sees — pushed unconditionally. So writing the same id
 * twice converged in the app and accumulated in the tests, and a bug in either direction was
 * invisible from the other.
 *
 * That matters now because an ANSWER is written under a stable id so that changing your mind
 * replaces the row. Toggling one goal four times read as "4 goals" on a hub until it did.
 */
test('writing the same id twice replaces, and does not accumulate', async () => {
  const hubs = createHubs(createMemoryHubStore());

  await hubs.add('sleep', 'goal', { label: 'Sleep better' }, { id: 'answer:goal:sleep:sleep better' });
  await hubs.add('sleep', 'goal', { held: false, label: 'Sleep better' }, { id: 'answer:goal:sleep:sleep better' });

  const entries = await hubs.entries('sleep');
  assert.equal(entries.length, 1, 'one answer, changed once, is one row');
  assert.equal(entries[0]?.payload.held, false, 'the newest answer is the one kept');
});

/** An event keeps a fresh id every time, because each one really happened. */
test('an entry with no id given still accumulates', async () => {
  const hubs = createHubs(createMemoryHubStore());

  await hubs.add('exercise', 'session', { activity: 'running', minutes: 30 });
  await hubs.add('exercise', 'session', { activity: 'running', minutes: 30 });

  assert.equal((await hubs.entries('exercise')).length, 2, 'two runs are two runs');
});

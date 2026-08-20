import assert from 'node:assert/strict';
import test from 'node:test';

import { ledgerFooter, ledgerLines } from '../src/application/hubs/ledger';
import type { HubEntry } from '../src/core/hubs';

function entry(id: string, hubLabel: string, kind: string, recordedAt: string): HubEntry & { hubLabel: string } {
  return { hubId: hubLabel.toLowerCase(), hubLabel, id, kind, payload: {}, recordedAt, source: 'manual' };
}

/**
 * The Twin's ledger replaced a four-row fixture with a footer reading "Showing 4 of 148", where 148
 * was invented. These pin the two things that made it a fixture rather than a list.
 */

test('entries from every hub merge into one list, newest first', () => {
  const lines = ledgerLines(
    [
      entry('a', 'Nutrition', 'meal', '2026-08-18T12:00:00.000Z'),
      entry('b', 'Labs', 'panel', '2026-08-20T09:00:00.000Z'),
      entry('c', 'Exercise', 'session', '2026-08-19T07:00:00.000Z'),
    ],
    10,
  );

  assert.deepEqual(
    lines.map((line) => line.hubLabel),
    ['Labs', 'Exercise', 'Nutrition'],
  );
});

/**
 * `recordedAt` is when the thing HAPPENED. A panel drawn in March and entered this afternoon does
 * not belong at the top of a ledger — the schema draws that distinction and this is where a list
 * would quietly ignore it.
 */
test('order comes from when it happened, never from when it was entered', () => {
  const old = entry('new-row-old-event', 'Labs', 'panel', '2026-03-01T00:00:00.000Z');
  const recent = entry('old-row-recent-event', 'Nutrition', 'meal', '2026-08-20T00:00:00.000Z');

  assert.deepEqual(
    ledgerLines([old, recent], 10).map((line) => line.id),
    ['old-row-recent-event', 'new-row-old-event'],
  );
});

/** Two things can happen at the same moment. A list that reshuffles on every read looks broken. */
test('a tie breaks the same way every time', () => {
  const at = '2026-08-20T09:00:00.000Z';
  const forward = ledgerLines([entry('a', 'Labs', 'panel', at), entry('b', 'Nutrition', 'weight', at)], 10);
  const backward = ledgerLines([entry('b', 'Nutrition', 'weight', at), entry('a', 'Labs', 'panel', at)], 10);

  assert.deepEqual(forward.map((l) => l.id), backward.map((l) => l.id));
});

test('the cap limits the list and nothing else', () => {
  const many = Array.from({ length: 12 }, (_, index) =>
    entry(`e${index}`, 'Exercise', 'session', `2026-08-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`),
  );

  assert.equal(ledgerLines(many, 5).length, 5);
  assert.equal(ledgerLines(many, 5)[0]?.id, 'e11', 'the cap must keep the newest, not the first read');
});

/**
 * A footer naming a total has to stand behind it, and one that appears when nothing is hidden is
 * noise. The fixture did both wrong at once.
 */
test('the footer only appears when something is actually hidden', () => {
  assert.equal(ledgerFooter(23, 5), 'Showing 5 of 23');
  assert.equal(ledgerFooter(5, 5), null);
  assert.equal(ledgerFooter(0, 5), null);
});

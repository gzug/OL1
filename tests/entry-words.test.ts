import assert from 'node:assert/strict';
import test from 'node:test';

import { day, kindWords, sourceWords } from '../src/ui/hubs/entryWords';

/**
 * The words two screens both use for a stored entry.
 *
 * This file exists because the vocabulary was written in one session while the first-run flow was
 * being built in another, and the two met in the Twin's ledger reading "Goal entry · Labs". The
 * fallback did its job — an unknown kind still rendered — and that is also the signal that a kind
 * has become real enough to deserve a word.
 */

test('every kind a screen can write today has words of its own', () => {
  /** Each of these is written by a real flow in this app. */
  const written = ['goal', 'meal', 'note', 'panel', 'session', 'weight', 'worked'];

  for (const kind of written) {
    assert.ok(
      !kindWords(kind, 1).includes('entry'),
      `"${kind}" fell through to the fallback — it needs a word in KINDS`,
    );
    assert.notEqual(kindWords(kind, 1), kindWords(kind, 2), `"${kind}" needs a plural`);
  }
});

/**
 * A hub the user invented holds entries nobody here wrote a word for. The alternative to a plain
 * fallback is a screen that silently drops what somebody logged, which is worse than clumsy.
 */
test('an unknown kind still renders, by its own name', () => {
  assert.equal(kindWords('breathwork', 1), 'breathwork entry');
  assert.equal(kindWords('breathwork', 3), 'breathwork entries');
});

test('a source is shown in a person’s words, and an unknown one is shown as it is', () => {
  assert.equal(sourceWords('manual'), 'entered by hand');
  assert.equal(sourceWords('chat'), 'from a conversation');
  assert.equal(sourceWords('carrier-pigeon'), 'carrier-pigeon');
});

/**
 * The date is UTC and that is a stated trade, not an oversight: a meal logged at 23:00 local can
 * show the following day. The alternative is a date that shifts as somebody travels.
 */
test('a date is a day and a month, and an unreadable one says so', () => {
  assert.equal(day('2026-08-21T06:03:54.255Z'), '21 Aug');
  assert.equal(day('2026-01-01T00:00:00.000Z'), '1 Jan');
  assert.equal(day('not a date'), 'undated');
});

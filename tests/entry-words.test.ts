import assert from 'node:assert/strict';
import test from 'node:test';

import { answerId, dailyId, day, isHeld, kindWords, sourceWords } from '../src/ui/hubs/entryWords';

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

/**
 * **An answer converges; an event accumulates.**
 *
 * A meal, a session and a blood panel each happened once and belong in a list. A goal and a named
 * sport are answers to a question — and toggling "Sleep better" four times used to write four rows,
 * so the Sleep hub read **"4 goals"** to somebody holding none. Found by tapping one chip four
 * times on the deployed screen.
 *
 * Every store replaces by id, so an answer carrying a stable one converges in place. Both the first
 * run and the settings screen must derive it here, or each writes its own row and believes it wrote
 * the only copy.
 */
test('the same answer is the same id, however it is typed', () => {
  const once = answerId('goal', 'sleep', 'Sleep better');

  assert.equal(answerId('goal', 'sleep', 'Sleep better'), once);
  assert.equal(answerId('goal', 'sleep', '  sleep better  '), once, 'case and spacing are not new answers');
});

test('different answers, hubs and kinds never collide', () => {
  const ids = [
    answerId('goal', 'sleep', 'Sleep better'),
    answerId('goal', 'sleep', 'Live longer'),
    answerId('goal', 'labs', 'Sleep better'),
    answerId('sport', 'exercise', 'golf'),
    answerId('sport', 'exercise', 'running'),
  ];

  assert.equal(new Set(ids).size, ids.length, 'two different answers share one row');
});

/** And it must not look like an event id, or a fresh entry could collide with an answer. */
test('an answer id is recognisable as one', () => {
  assert.match(answerId('goal', 'sleep', 'Sleep better'), /^answer:/);
});

/**
 * **A goal you turned off is written down and is not one you have.**
 *
 * Nothing in OL1 deletes, so declining is recorded rather than erased. Counting that as something
 * held is how the Sleep hub came to say "1 goal" to somebody who had just turned their only goal
 * off — the same defect as "4 goals" one layer up, where the rows converged and the count still
 * spoke for a person who had said no.
 */
test('a declined answer is recorded, and is not something a person has', () => {
  assert.equal(isHeld({ payload: { label: 'Sleep better' } }), true);
  assert.equal(isHeld({ payload: { held: false, label: 'Sleep better' } }), false);
});

/** Everything that is not an answer is held by default — a meal is not something you declined. */
test('an entry that never had the idea of being held still counts', () => {
  for (const payload of [{}, { macros: { calories: 520 } }, { activity: 'running', minutes: 30 }]) {
    assert.equal(isHeld({ payload }), true, `${JSON.stringify(payload)} was dropped`);
  }
});

/**
 * **One weigh-in a day.**
 *
 * A weigh-in really is an event — two a week apart are two readings. But two on the same day, from
 * walking the first run twice, are one reading recorded twice. Found by walking the first run twice
 * on the deployed preview: the goals and the sports converged and the weigh-in did not, so
 * Nutrition read "2 weigh-ins" for one weight given once.
 */
test('the same day is the same reading; another day is another one', () => {
  const monday = dailyId('weight', 'nutrition', '2026-08-21T09:00:00.000Z');

  assert.equal(dailyId('weight', 'nutrition', '2026-08-21T21:45:00.000Z'), monday, 'the hour is not a new day');
  assert.notEqual(dailyId('weight', 'nutrition', '2026-08-22T09:00:00.000Z'), monday, 'tomorrow is a new reading');
});

/** A measurement id is not an answer id, so the two can never collide. */
test('a daily id and an answer id are distinguishable', () => {
  assert.match(dailyId('weight', 'nutrition', '2026-08-21'), /^daily:/);
  assert.notEqual(dailyId('weight', 'nutrition', '2026-08-21'), answerId('weight', 'nutrition', '2026-08-21'));
});

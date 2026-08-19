import assert from 'node:assert/strict';
import test from 'node:test';

import { splitCoachVoices, systemPromptFor } from '../src/application/chat/prompt';
import {
  MAX_COACHES_PER_CONVERSATION,
  latestFor,
  newThreadId,
  recentFor,
  selectionLabel,
  tableKey,
  toggleCoach,
} from '../src/application/chat/threads';
import { coachesAtTable, hubCoaches, nestedCoaches } from '../src/ui/chat/coachList';
import { COACHES, SEED_HUBS, findCoach, isDomainHub, orbitHubs } from '../src/ui/hubs/catalog';

/** Which conversation a selection lands in, who may be in it, and where the list comes from. */

const thread = (id: string, coachIds: readonly string[], updatedAt: string) => ({
  coachIds,
  id,
  updatedAt,
});

/**
 * The whole point of the 2026-08-19 change: a coach can have more than one conversation. While the
 * id was derived from the coaches this was impossible, and it is what the owner asked for.
 */
test('two conversations with the same coach are two conversations', () => {
  assert.notEqual(newThreadId(), newThreadId());
});

test('the same coaches are the same table whatever order they were picked in', () => {
  assert.equal(tableKey(['sleep', 'exercise']), tableKey(['exercise', 'sleep']));
  assert.notEqual(tableKey(['sleep']), tableKey(['sleep', 'exercise']));
});

test('a coach picked twice does not make a different table', () => {
  assert.equal(tableKey(['sleep', 'sleep']), tableKey(['sleep']));
});

test('a table with no coaches is a table — the general assistant', () => {
  assert.equal(tableKey([]), '');
});

test('resuming a table opens its most recent conversation', () => {
  const threads = [
    thread('older', ['sleep'], '2026-08-01T09:00:00.000Z'),
    thread('newer', ['sleep'], '2026-08-05T09:00:00.000Z'),
  ];
  assert.equal(latestFor(threads, ['sleep'])?.id, 'newer');
});

/**
 * "Exactly these coaches" is the rule, and it is not the same rule as `recentFor` below. Opening a
 * Sleep-and-Exercise conversation because Sleep was asked for would drop a second coach into what
 * the person thought was a one-to-one conversation.
 */
test('resuming one coach never opens a conversation that had two', () => {
  const threads = [thread('pair', ['sleep', 'exercise'], '2026-08-05T09:00:00.000Z')];
  assert.equal(latestFor(threads, ['sleep']), undefined);
});

test('a table nobody has used yet has no conversation to resume', () => {
  assert.equal(latestFor([], ['sleep']), undefined);
});

/**
 * The hub's "last three" is deliberately the looser rule: a conversation where this coach sat with
 * two others still counts as one you had with them, because from the hub's side it is.
 */
test('a hub counts a conversation its coach was part of, even alongside others', () => {
  const threads = [
    thread('a', ['sleep'], '2026-08-01T09:00:00.000Z'),
    thread('b', ['sleep', 'exercise'], '2026-08-02T09:00:00.000Z'),
    thread('c', ['nutrition'], '2026-08-03T09:00:00.000Z'),
    thread('d', ['sleep'], '2026-08-04T09:00:00.000Z'),
  ];

  assert.deepEqual(recentFor(threads, 'sleep').map((item) => item.id), ['d', 'b', 'a']);
  assert.deepEqual(recentFor(threads, 'nutrition').map((item) => item.id), ['c']);
});

test('the hub shows three, newest first, however many there are', () => {
  const threads = ['01', '02', '03', '04', '05'].map((day) =>
    thread(day, ['sleep'], `2026-08-${day}T09:00:00.000Z`),
  );
  assert.deepEqual(recentFor(threads, 'sleep').map((item) => item.id), ['05', '04', '03']);
});

test('five coaches fit at a table and a sixth does not', () => {
  const five = ['exercise', 'nutrition', 'medical', 'resilience', 'longevity'];
  assert.equal(five.length, MAX_COACHES_PER_CONVERSATION);

  const refused = toggleCoach(five, 'sleep');
  assert.deepEqual(refused, five, 'the sixth coach must not be added');
  assert.equal(refused, five, 'refusal returns the same array, so the screen can say so');
});

test('a full table still lets a coach be swapped out', () => {
  const five = ['exercise', 'nutrition', 'medical', 'resilience', 'longevity'];
  const withoutMedical = toggleCoach(five, 'medical');
  assert.equal(withoutMedical.length, 4);
  assert.equal(toggleCoach(withoutMedical, 'sleep').length, 5);
});

test('the chip shows one name or a count, and never a string the chip cannot hold', () => {
  assert.equal(selectionLabel([]), 'Ask anything');
  assert.equal(selectionLabel(['Sleep Coach']), 'Sleep Coach');
  assert.equal(selectionLabel(['Sleep Coach', 'Exercise Coach']), '2 coaches');
  assert.equal(selectionLabel(['a', 'b', 'c']), '3 coaches');

  // The chip is a fixed width, so the label has a length ceiling. The longest single coach name in
  // the catalog is what that ceiling has to clear; two joined names never did.
  const longest = Math.max(...COACHES.map((coach) => coach.name.length));
  for (let count = 0; count <= COACHES.length; count += 1) {
    const label = selectionLabel(COACHES.slice(0, count).map((coach) => coach.name));
    assert.ok(label.length <= longest, `"${label}" is too long for the chip`);
  }
});

test('the selector offers only coaches the catalog can resolve', () => {
  for (const coach of [...hubCoaches(), ...nestedCoaches()]) {
    assert.ok(findCoach(coach.id) !== undefined, `"${coach.id}" is not in the catalog`);
  }
});

test('the coach list is the catalog, not a copy of it', () => {
  // If someone writes a second list here, this is what catches it: every DOMAIN hub on the ring
  // must contribute exactly one coach, and no coach may appear that no hub opens. The Open Table
  // sits on the ring and contributes none, because it is the way to reach all of them.
  assert.equal(hubCoaches().length, orbitHubs().filter(isDomainHub).length);

  const offered = new Set([...hubCoaches(), ...nestedCoaches()].map((coach) => coach.id));
  const fromHubs = new Set(
    SEED_HUBS.map((hub) => hub.coachId).filter((id): id is string => id !== undefined),
  );
  assert.deepEqual([...offered].sort(), [...fromHubs].sort());
});

test('coaches nested inside a hub are offered, and are not on the ring', () => {
  const sports = nestedCoaches().map((coach) => coach.id);
  assert.ok(sports.length > 0, 'this guard stops checking anything if the nesting disappears');
  for (const id of sports) {
    assert.equal(
      hubCoaches().some((coach) => coach.id === id),
      false,
      `"${id}" lives inside a hub and must not also sit on the ring`,
    );
  }
});

test('chosen coaches come back in catalog order, not in the order they were tapped', () => {
  const tappedLast = coachesAtTable(['sleep', 'exercise']).map((coach) => coach.id);
  const tappedFirst = coachesAtTable(['exercise', 'sleep']).map((coach) => coach.id);
  assert.deepEqual(tappedLast, tappedFirst);
  assert.deepEqual(tappedLast, ['exercise', 'sleep']);
});

test('the prompt names every coach at the table and no one else', () => {
  const table = coachesAtTable(['sleep', 'exercise']);
  const prompt = systemPromptFor(table);

  for (const coach of table) assert.ok(prompt.includes(coach.name), `${coach.name} is missing`);
  for (const coach of COACHES) {
    if (table.some((seated) => seated.id === coach.id)) continue;
    assert.equal(prompt.includes(coach.name), false, `${coach.name} is not at this table`);
  }
});

test('the prompt never tells the model it can see health data', () => {
  for (const selection of [[], ['sleep'], ['sleep', 'exercise']]) {
    const prompt = systemPromptFor(coachesAtTable(selection));
    assert.ok(prompt.includes('no access'), 'the model must be told it has no data');
    assert.ok(prompt.includes('Never diagnose'), 'the safety floor must survive every branch');
  }
});

test('a round table is split back into the voices that spoke', () => {
  const table = coachesAtTable(['sleep', 'exercise']);
  const voices = splitCoachVoices(
    'Sleep Coach: Three short nights in a row.\nExercise Coach: Load stepped up on Tuesday.\nTogether: Take an easy day.',
    table,
  );

  assert.deepEqual(
    voices.map((voice) => voice.speaker),
    ['Sleep Coach', 'Exercise Coach', 'Together'],
  );
  assert.equal(voices[0].text, 'Three short nights in a row.');
});

test('a wrapped line belongs to whoever spoke last, not to a new voice', () => {
  const voices = splitCoachVoices(
    'Sleep Coach: Three short nights.\nand the one before that too.',
    coachesAtTable(['sleep']),
  );
  assert.equal(voices.length, 1);
  assert.equal(voices[0].text, 'Three short nights.\nand the one before that too.');
});

test('an answer that ignores the format is still readable', () => {
  const voices = splitCoachVoices('Just a paragraph.', coachesAtTable(['sleep', 'exercise']));
  assert.equal(voices.length, 1);
  assert.equal(voices[0].speaker, undefined);
  assert.equal(voices[0].text, 'Just a paragraph.');
});

test('markdown around the name does not hide the speaker', () => {
  const voices = splitCoachVoices('**Sleep Coach: Short nights.', coachesAtTable(['sleep']));
  assert.equal(voices[0].speaker, 'Sleep Coach');
});

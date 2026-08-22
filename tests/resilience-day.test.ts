import assert from 'node:assert/strict';
import test from 'node:test';

import type { HubEntry } from '../src/core/hubs';
import { mostOften, resiliencePeriods } from '../src/ui/resilience/cockpit';
import { DAY_WORDS, dayEntryId, dayPayload, dayWordLabel } from '../src/ui/resilience/day';

/**
 * How a day felt, in one word. **Every value here is invented.**
 *
 * The discipline under test is `docs/decisions/0017`: this may count days and may never average
 * feelings. The owner dropped Legacy's 0–100 recovery score on 2026-08-19 and five integers would
 * rebuild it through a side door.
 */

/* Evening, because that is when somebody answers this — a morning `NOW` would put today's own
   entry in the future, and the window correctly refuses anything ahead of the clock. */
const NOW = '2026-08-22T21:00:00.000Z';

const day = (date: string, word: string): HubEntry => ({
  hubId: 'resilience',
  id: `daily:day:resilience:${date}`,
  kind: 'day',
  payload: { word },
  recordedAt: `${date}T18:00:00.000Z`,
  source: 'manual',
});

test('the five words are offered and each has a label', () => {
  assert.equal(DAY_WORDS.length, 5);
  for (const word of DAY_WORDS) {
    assert.equal(dayWordLabel(word.id), word.label);
  }
  assert.equal(dayWordLabel('elated'), null, 'a word this app does not offer has no label');
});

/**
 * **The refusal `0017` exists for.** There is nothing in the stored shape to take a mean of.
 */
test('nothing stored about a day is a number', () => {
  for (const word of DAY_WORDS) {
    const stored = dayPayload(word.id, '');
    assert.equal(typeof stored.word, 'string');
    for (const value of Object.values(stored)) {
      assert.notEqual(typeof value, 'number', 'a day acquired a number to average');
    }
  }
});

test('answering again replaces the same day rather than adding a second', () => {
  assert.equal(dayEntryId(NOW), dayEntryId('2026-08-22T23:30:00.000Z'));
  assert.notEqual(dayEntryId(NOW), dayEntryId('2026-08-21T09:00:00.000Z'));
});

test('a blank note is absent rather than empty', () => {
  assert.deepEqual(dayPayload('steady', '  '), { word: 'steady' });
  assert.deepEqual(dayPayload('steady', ' long meeting '), {
    note: 'long meeting',
    word: 'steady',
  });
});

test('no days draws nothing at all', () => {
  assert.deepEqual(resiliencePeriods([], NOW), []);
  assert.deepEqual(resiliencePeriods([{ ...day('2026-08-22', 'steady'), kind: 'note' }], NOW), []);
  assert.deepEqual(
    resiliencePeriods([day('2026-08-22', 'elated')], NOW),
    [],
    'a word this app does not offer is not a word it can report',
  );
});

test('the block reports the last answer, the count, and the commonest word', () => {
  const [block] = resiliencePeriods(
    [
      day('2026-08-22', 'steady'),
      day('2026-08-21', 'tired'),
      day('2026-08-20', 'steady'),
      day('2026-08-19', 'strong'),
    ],
    NOW,
  );

  assert.equal(block?.label, 'How your days have felt');
  assert.deepEqual(block?.rows[0], { label: 'Last answer', value: 'Steady', when: 'today' });
  assert.deepEqual(block?.rows[1], { label: 'Days described', value: '4', when: 'of the last 7' });
  assert.deepEqual(block?.rows[2], {
    label: 'Most often',
    value: 'Steady',
    when: '2 of the 4 days you described',
  });
});

/**
 * **A tie has no answer and the screen says so.** Picking a winner alphabetically, or by whichever
 * the sort happened to leave first, would be inventing the reading.
 */
test('a tie is admitted rather than broken', () => {
  assert.equal(mostOften([]), null);
  assert.equal(
    mostOften([
      { day: '2026-08-22', label: 'Tired' },
      { day: '2026-08-21', label: 'Steady' },
    ]),
    'even',
  );

  const [block] = resiliencePeriods(
    [day('2026-08-22', 'tired'), day('2026-08-21', 'steady')],
    NOW,
  );
  assert.deepEqual(block?.rows[2], {
    label: 'Most often',
    value: 'No one word',
    when: 'no answer came up more than the rest',
  });
});

/** The last answer is the last one however long ago; the count is only the last seven days. */
test('an old answer still shows, and does not count towards the week', () => {
  const [block] = resiliencePeriods([day('2026-07-30', 'drained')], NOW);

  assert.deepEqual(block?.rows[0], { label: 'Last answer', value: 'Drained', when: '3 weeks ago' });
  assert.deepEqual(block?.rows[1], { label: 'Days described', value: '0', when: 'of the last 7' });
  assert.equal(block?.rows.length, 2, 'and there is no commonest word in a week with no days');
});

/**
 * **Counting days is allowed. Averaging feelings is not.** Nothing the block produces may be a
 * ranking, a mean, or a judgement of a run of days.
 */
test('the block never grades a week', () => {
  const text = JSON.stringify(
    resiliencePeriods(
      [
        day('2026-08-22', 'drained'),
        day('2026-08-21', 'drained'),
        day('2026-08-20', 'tired'),
        day('2026-08-19', 'drained'),
      ],
      NOW,
    ),
  ).toLowerCase();

  for (const claim of ['average', 'score', 'out of', 'improving', 'declining', 'trend', 'better', 'worse']) {
    assert.ok(!text.includes(claim), `the block graded the week: "${claim}"`);
  }
});

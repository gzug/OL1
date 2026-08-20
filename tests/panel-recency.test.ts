import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DAYS_PER_MONTH,
  FRESH_MONTHS,
  STALE_MONTHS,
  panelCount,
  panelRecency,
  recencySentence,
} from '../src/application/labs/panelRecency';

const NOW = '2026-08-20T12:00:00.000Z';

/** Built with the same divisor the helper uses, so a boundary test lands exactly on the boundary. */
const monthsAgo = (months: number) =>
  new Date(Date.parse(NOW) - months * DAYS_PER_MONTH * 86_400_000).toISOString();

const panel = (at: string) => ({ kind: 'panel', recordedAt: at });

test('no panel is a state of its own, not a stale one', () => {
  const none = panelRecency([], NOW);
  assert.equal(none.status, 'none');
  assert.equal(none.monthsAgo, null);
  assert.match(recencySentence(none), /nothing to read/);
});

test('other kinds of entry are not panels', () => {
  const meals = [{ kind: 'meal', recordedAt: NOW }];
  assert.equal(panelRecency(meals, NOW).status, 'none');
  assert.equal(panelCount(meals), 0);
});

/** Legacy's thresholds, unchanged: fresh under six months, ageing to twelve, stale past that. */
test('fresh, ageing and stale land exactly where Legacy put them', () => {
  assert.equal(panelRecency([panel(monthsAgo(1))], NOW).status, 'fresh');
  assert.equal(panelRecency([panel(monthsAgo(FRESH_MONTHS - 0.1))], NOW).status, 'fresh');
  assert.equal(panelRecency([panel(monthsAgo(FRESH_MONTHS))], NOW).status, 'ageing');
  assert.equal(panelRecency([panel(monthsAgo(STALE_MONTHS - 0.1))], NOW).status, 'ageing');
  assert.equal(panelRecency([panel(monthsAgo(STALE_MONTHS))], NOW).status, 'stale');
  assert.equal(panelRecency([panel(monthsAgo(40))], NOW).status, 'stale');
});

test('the newest panel is the one that counts', () => {
  const both = [panel(monthsAgo(20)), panel(monthsAgo(2))];
  assert.equal(panelRecency(both, NOW).status, 'fresh');
  assert.equal(panelCount(both), 2);
});

/**
 * A panel dated in the future is a wrong date, not a fresh panel. Treating it as fresh would
 * silence the nudge for as long as the mistake stood.
 */
test('a panel dated in the future does not read as freshly drawn', () => {
  const ahead = panelRecency([panel('2027-01-01T00:00:00.000Z')], NOW);
  assert.equal(ahead.monthsAgo, 0);
  assert.equal(ahead.status, 'fresh');
  assert.match(recencySentence(ahead), /this month/);
});

/**
 * Every sentence is about a DATE. Legacy's sibling file says these are "general retest cadences
 * only... not medical advice and not a treatment recommendation", and that has to survive contact
 * with the copy, not just live in a comment.
 */
test('nothing here tells anybody to book a test', () => {
  const banned = /\b(you should|book|schedule|get (?:a|another) (?:test|panel)|see (?:a|your) doctor|retest now|overdue)\b/i;

  for (const months of [0, 3, 7, 14, 30]) {
    const sentence = recencySentence(panelRecency([panel(monthsAgo(months))], NOW));
    assert.equal(banned.exec(sentence), null, `"${banned.exec(sentence)?.[0]}" appears in: ${sentence}`);
  }
  assert.equal(banned.exec(recencySentence(panelRecency([], NOW))), null);
});

test('the sentence counts months in words a person would use', () => {
  assert.match(recencySentence(panelRecency([panel(monthsAgo(0.2))], NOW)), /this month/);
  assert.match(recencySentence(panelRecency([panel(monthsAgo(1.2))], NOW)), /1 month ago/);
  assert.match(recencySentence(panelRecency([panel(monthsAgo(7))], NOW)), /7 months ago/);
});

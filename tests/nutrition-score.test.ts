import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIN_MEALS,
  confidenceFor,
  nutritionScore,
  partsUsed,
  type ScoredMeal,
} from '../src/application/nutrition/score';

const meal = (day: string, macros: Record<string, number>): ScoredMeal => ({
  payload: { macros },
  recordedAt: `2026-08-${day}T12:00:00.000Z`,
});

/**
 * `docs/decisions/0009` is the argument for this file existing at all: it scores the week's LOGGING
 * against published reference points, never the person. These are the assertions that keep it on
 * that side of the line.
 */

test('a score is withheld until there is enough logging to make one', () => {
  const two = [meal('17', { calories: 600, proteinGrams: 40 }), meal('18', { calories: 600, proteinGrams: 40 })];
  assert.ok(two.length < MIN_MEALS);
  assert.equal(nutritionScore(two).quality, null);

  const three = [...two, meal('19', { calories: 600, proteinGrams: 40 })];
  assert.ok(nutritionScore(three).quality !== null);
});

/**
 * The distinction 0009 turns on: a week eaten perfectly and recorded twice scores badly, because the
 * score is of the record. A score that rose when someone ate better would be a judgement about them.
 */
test('confidence measures how much was logged, never how good the eating was', () => {
  assert.equal(confidenceFor(12, 6), 'high');
  assert.equal(confidenceFor(6, 3), 'med');
  assert.equal(confidenceFor(2, 1), 'low');
  assert.equal(confidenceFor(20, 1), 'low', 'twenty meals on one day is not a week');
  assert.equal(confidenceFor(4, 4), 'low', 'four meals across four days is still thin');
});

/**
 * The reason this was worth porting rather than inventing: a missing part is missing, never a zero.
 * A week with no fibre recorded is scored on protein alone.
 */
test('a macro nobody recorded does not drag the score down', () => {
  const proteinOnly = ['17', '18', '19'].map((day) => meal(day, { calories: 600, proteinGrams: 27 }));
  const score = nutritionScore(proteinOnly);

  assert.equal(score.subScores.fiber, null);
  assert.equal(score.subScores.protein, 100, 'protein at 18% of energy should reach the target');
  assert.equal(score.quality, 100, 'an unrecorded macro scored as zero');
  assert.deepEqual(partsUsed(score), ['protein']);
});

test('a meal that recorded only half a ratio is skipped, not counted as zero', () => {
  const mixed = [
    meal('17', { calories: 600, proteinGrams: 27 }),
    meal('18', { calories: 600 }),
    meal('19', { calories: 600, proteinGrams: 27 }),
  ];
  assert.equal(nutritionScore(mixed).subScores.protein, 100);
});

/**
 * Always null today: our meal flow records macros and a note, not a list of items with a processing
 * level. The slot stays so the score gains a third part the day extraction exists, rather than the
 * weights being rewritten then.
 */
test('whole food is honestly absent, and the score says which parts it used', () => {
  const meals = ['17', '18', '19'].map((day) =>
    meal(day, { calories: 600, fiberGrams: 9, proteinGrams: 27 }),
  );
  const score = nutritionScore(meals);

  assert.equal(score.subScores.wholeFood, null);
  assert.deepEqual(partsUsed(score), ['fibre', 'protein']);
});

test('the score counts days as well as meals', () => {
  const sameDay = ['19', '19', '19'].map((day) => meal(day, { calories: 500, proteinGrams: 20 }));
  const score = nutritionScore(sameDay);

  assert.equal(score.loggedMeals, 3);
  assert.equal(score.loggedDays, 1);
  assert.equal(score.confidence, 'low');
});

test('nothing logged scores nothing, and does not divide by zero', () => {
  const score = nutritionScore([]);
  assert.equal(score.quality, null);
  assert.equal(score.subScores.protein, null);
  assert.deepEqual(partsUsed(score), []);
});

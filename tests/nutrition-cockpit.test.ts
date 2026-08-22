import assert from 'node:assert/strict';
import test from 'node:test';

import type { HubEntry } from '../src/core/hubs';
import { nutritionPeriods } from '../src/ui/meals/cockpit';

/**
 * The grams a person typed, given back to them. **Every value here is invented.**
 *
 * The window is anchored on a fixed `now` rather than the clock — a test that moves with the day
 * is a test that fails on a Sunday.
 */

const NOW = '2026-08-22T09:00:00.000Z';

const meal = (day: string, macros: Record<string, unknown>, id = day): HubEntry => ({
  hubId: 'nutrition',
  id: `meal-${id}`,
  kind: 'meal',
  payload: { macros },
  /* Morning, so a meal dated "today" is behind `NOW` rather than three hours ahead of it — the
     window refuses anything in the future, and refusing it is the point. */
  recordedAt: `${day}T08:00:00.000Z`,
  source: 'manual',
});

test('nothing logged draws nothing at all', () => {
  assert.deepEqual(nutritionPeriods([], NOW), []);
  assert.deepEqual(
    nutritionPeriods([meal('2026-08-21', {})], NOW),
    [],
    'a meal with no macros on it produces no block, rather than a block of dashes',
  );
});

test('a macro is averaged over the meals, in the order a label prints them', () => {
  const [block] = nutritionPeriods(
    [
      meal('2026-08-22', { calories: 500, proteinGrams: 40, carbsGrams: 50, fatGrams: 20, fiberGrams: 8 }),
      meal('2026-08-21', { calories: 700, proteinGrams: 50, carbsGrams: 60, fatGrams: 30, fiberGrams: 12 }),
    ],
    NOW,
  );

  assert.equal(block?.label, 'What you logged, per meal');
  assert.deepEqual(
    block?.rows.map((row) => row.label),
    ['Calories', 'Protein', 'Carbohydrate', 'Fat', 'Fibre'],
  );
  assert.deepEqual(block?.rows[0], {
    label: 'Calories',
    value: '600 kcal',
    when: 'average of 2 meals',
  });
  assert.deepEqual(block?.rows[1], { label: 'Protein', value: '45 g', when: 'average of 2 meals' });
});

/**
 * **A blank is absent, never a zero** — the rule `score.ts` follows, carried through the
 * arithmetic. A macro recorded twice out of nine cannot pass as the week, and the row says so.
 */
test('a macro is averaged over the meals that recorded it, and says how many', () => {
  const [block] = nutritionPeriods(
    [
      meal('2026-08-22', { calories: 500, proteinGrams: 40 }),
      meal('2026-08-21', { calories: 700 }),
      meal('2026-08-20', { calories: 600 }),
    ],
    NOW,
  );

  assert.deepEqual(block?.rows[0], {
    label: 'Calories',
    value: '600 kcal',
    when: 'average of 3 meals',
  });
  assert.deepEqual(block?.rows[1], {
    label: 'Protein',
    value: '40 g',
    when: 'average of 1 meal',
  });
  assert.equal(block?.rows.length, 2, 'the three nobody recorded get no rows at all');
});

test('a macro that is not a usable number is not counted', () => {
  const [block] = nutritionPeriods(
    [
      meal('2026-08-22', { calories: 500, proteinGrams: 40 }),
      meal('2026-08-21', { calories: '700', proteinGrams: 0 }, 'strings'),
    ],
    NOW,
  );

  assert.equal(block?.rows[0]?.when, 'average of 1 meal', 'a string is not a number');
  assert.equal(block?.rows[1]?.when, 'average of 1 meal', 'and a zero is not a portion');
});

/** Older than the window is outside it, through the same function every other week claim uses. */
test('a meal from a fortnight ago is not in this week', () => {
  const [block] = nutritionPeriods(
    [meal('2026-08-22', { calories: 500 }), meal('2026-08-05', { calories: 2000 })],
    NOW,
  );

  assert.deepEqual(block?.rows[0], {
    label: 'Calories',
    value: '500 kcal',
    when: 'average of 1 meal',
  });
});

/**
 * **No clock times.** The fixture had "First meal 09:40" and "Typical first meal 08:15".
 * `recordedAt` is stored and rendered in UTC — `entryWords.day` explains that trade and refuses to
 * print an hour — so a time here would be wrong by the traveller's offset and look right anyway.
 */
test('nothing in the block is a time of day', () => {
  const block = nutritionPeriods([meal('2026-08-22', { calories: 500, fiberGrams: 9 })], NOW);

  assert.ok(!/\d{1,2}:\d{2}/.test(JSON.stringify(block)), 'a clock time reached the cockpit');
});

/**
 * **Weight lives in this hub**, since the Body hub was retired on 2026-08-19. The first run stores
 * one, and `dailyId` makes it converge to at most one a day — so the count is days weighed rather
 * than times a button was pressed.
 */
const weighIn = (day: string, kg: number, id = day): HubEntry => ({
  hubId: 'nutrition',
  id: `weight-${id}`,
  kind: 'weight',
  payload: { kg },
  recordedAt: `${day}T07:00:00.000Z`,
  source: 'manual',
});

test('the last weigh-in is the last one, however long ago', () => {
  const [weight] = nutritionPeriods(
    [weighIn('2026-07-20', 83.1), weighIn('2026-08-18', 82.4), weighIn('2026-06-01', 85)],
    NOW,
  );

  assert.equal(weight?.label, 'Weight');
  assert.deepEqual(weight?.rows[0], {
    label: 'Last weigh-in',
    value: '82.4 kg',
    when: '4 days ago',
  });
  assert.deepEqual(weight?.rows[1], {
    label: 'Weigh-ins',
    value: '3',
    when: 'days weighed, at most one a day',
  });
});

/** Somebody can step on a scale in a week they never logged a meal, and still see the weight. */
test('weigh-ins do not need meals beside them', () => {
  const periods = nutritionPeriods([weighIn('2026-08-22', 82)], NOW);

  assert.equal(periods.length, 1);
  assert.equal(periods[0]?.label, 'Weight');
  assert.equal(periods[0]?.rows[1]?.when, 'the only one on file');
});

/**
 * **No direction.** The fixture had one — "Flat", "too few readings to say more" — and calling a
 * trend on weight needs a threshold this app does not have. `docs/decisions/0015` is the same
 * refusal in Labs: compute what is arithmetic, refuse what is a judgement.
 */
test('nothing here calls a direction on a weight', () => {
  const periods = nutritionPeriods(
    [weighIn('2026-08-22', 82), weighIn('2026-08-15', 84), weighIn('2026-08-08', 86)],
    NOW,
  );

  const text = JSON.stringify(periods).toLowerCase();
  for (const claim of ['flat', 'trend', 'direction', 'up', 'down', 'losing', 'gaining']) {
    assert.ok(!text.includes(claim), `the cockpit claimed a direction: "${claim}"`);
  }
});

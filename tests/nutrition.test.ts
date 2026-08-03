import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MACROS,
  filledCount,
  macroProblem,
  macroProblems,
  macrosAgree,
} from '../src/ui/meals/nutrition';

test('the five macros each carry a unit and a sane range', () => {
  assert.deepEqual(
    MACROS.map((macro) => macro.key),
    ['calories', 'proteinGrams', 'carbsGrams', 'fatGrams', 'fiberGrams'],
  );
  for (const macro of MACROS) {
    assert.ok(macro.unit.length > 0, `${macro.key} has no unit`);
    assert.ok(macro.sane.min < macro.sane.max, `${macro.key} has an inverted range`);
  }
});

/**
 * Legacy's parser drops fibre to null rather than to zero, with a comment calling it an honesty
 * rule. An empty macro here has to stay a first-class answer for the same reason.
 */
test('an empty macro is not a problem, fibre included', () => {
  for (const macro of MACROS) {
    assert.equal(macroProblem(macro, ''), null);
    assert.equal(macroProblem(macro, '  '), null);
  }
});

test('a value outside the sane range is caught, on every macro', () => {
  for (const macro of MACROS) {
    assert.equal(macroProblem(macro, String(macro.sane.max + 1)), 'outsideSane');
    assert.equal(macroProblem(macro, '-1'), 'outsideSane');
    assert.equal(macroProblem(macro, String(macro.sane.max)), null, 'the boundary is allowed');
  }
});

test('text that is not a number is caught', () => {
  for (const text of ['abc', '4,2', '1.2.3']) {
    assert.equal(macroProblem(MACROS[0], text), 'notANumber');
  }
});

test('every problem is reported, not just the first', () => {
  const entries = MACROS.map((macro) => ({ key: macro.key, text: String(macro.sane.max + 1) }));
  assert.equal(macroProblems(entries).length, 5);
});

/**
 * The 4/4/9 cross-check. Not from Legacy — new, and deliberately loose: alcohol is not in the
 * formula, fibre is partly unavailable, and rounding five numbers compounds. It exists to catch a
 * misplaced decimal point, never to audit a meal.
 */
test('macros are judged against calories only when there is enough to judge', () => {
  const partial = [
    { key: 'calories' as const, text: '500' },
    { key: 'proteinGrams' as const, text: '25' },
    { key: 'carbsGrams' as const, text: '' },
    { key: 'fatGrams' as const, text: '' },
    { key: 'fiberGrams' as const, text: '' },
  ];
  assert.equal(macrosAgree(partial), null, 'an unjudgeable meal must not be called wrong');
});

test('macros that add up agree, and a misplaced decimal does not', () => {
  const build = (calories: string) => [
    { key: 'calories' as const, text: calories },
    { key: 'proteinGrams' as const, text: '25' },
    { key: 'carbsGrams' as const, text: '40' },
    { key: 'fatGrams' as const, text: '15' },
    { key: 'fiberGrams' as const, text: '' },
  ];

  // 25*4 + 40*4 + 15*9 = 395
  assert.equal(macrosAgree(build('400')), true, '400 against an implied 395 must pass');
  assert.equal(macrosAgree(build('4000')), false, 'a decimal point in the wrong place must not');
  assert.equal(macrosAgree(build('300')), false, 'a 24% shortfall is outside the quarter tolerance');
});

test('an all-zero meal agrees with itself', () => {
  const zeros = MACROS.map((macro) => ({ key: macro.key, text: '0' }));
  assert.equal(macrosAgree(zeros), true, 'zero calories and zero macros is consistent, not an error');
});

test('filled macros are counted, blanks are not', () => {
  const entries = MACROS.map((macro, index) => ({ key: macro.key, text: index < 2 ? '10' : '' }));
  assert.equal(filledCount(entries), 2);
});

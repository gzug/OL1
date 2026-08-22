import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EGFR_CAVEAT,
  MIN_AGE,
  STAGE_MEANING,
  estimatedGfr,
  gfrAsShown,
  gfrStage,
} from '../src/application/labs/egfr';

/**
 * CKD-EPI 2021 — the first derived metric, because it needs nothing the panel does not already
 * hold. Every value below is INVENTED and checked against published calculators.
 */

const near = (actual: number | null, expected: number, why: string) => {
  assert.ok(actual !== null, `${why}: got null`);
  assert.ok(Math.abs((actual as number) - expected) < 0.5, `${why}: got ${actual}, wanted ~${expected}`);
};

test('the equation matches published values, for both sexes', () => {
  near(estimatedGfr({ age: 50, creatinine: 0.9, sex: 'male' }), 104.0, 'male 0.9 at 50');
  near(estimatedGfr({ age: 50, creatinine: 0.9, sex: 'female' }), 77.9, 'female 0.9 at 50');
  near(estimatedGfr({ age: 65, creatinine: 2.0, sex: 'male' }), 36.4, 'male 2.0 at 65');
});

/**
 * The 2021 equation replaced one that raised the estimate for Black patients with no physiological
 * basis. There is no race argument here and there must never be one — this test exists so that
 * adding one back breaks something visible.
 */
test('the equation takes exactly three inputs, and race is not one of them', () => {
  const keys = Object.keys({ age: 50, creatinine: 0.9, sex: 'male' as const });
  assert.deepEqual(keys.sort(), ['age', 'creatinine', 'sex']);
});

/**
 * **A sex the equation cannot use produces no number, not a split difference.**
 *
 * It was fitted with two sex coefficients, and the two answers differ by roughly a sixth. Picking
 * one for somebody who declined to say would be inventing a body; averaging them would be inventing
 * a different one and hiding it.
 */
test('a sex the equation was not fitted on returns null', () => {
  for (const sex of ['other', 'preferNotToSay'] as const) {
    assert.equal(estimatedGfr({ age: 40, creatinine: 1, sex }), null, `${sex} must not produce a number`);
  }

  const male = estimatedGfr({ age: 40, creatinine: 1, sex: 'male' }) as number;
  const female = estimatedGfr({ age: 40, creatinine: 1, sex: 'female' }) as number;
  assert.ok(male / female > 1.1, 'the two answers are far too different to average');
});

/** Fitted on adults. Children are estimated by a different equation entirely. */
test('it refuses ages and creatinines it was not built for', () => {
  assert.equal(estimatedGfr({ age: MIN_AGE - 1, creatinine: 0.7, sex: 'female' }), null);
  assert.equal(estimatedGfr({ age: 200, creatinine: 0.7, sex: 'female' }), null);
  assert.equal(estimatedGfr({ age: 40, creatinine: 0, sex: 'male' }), null);
  assert.equal(estimatedGfr({ age: 40, creatinine: -1, sex: 'male' }), null);
  assert.equal(estimatedGfr({ age: Number.NaN, creatinine: 1, sex: 'male' }), null);
});

test('the stages are ordered and cover every value', () => {
  assert.equal(gfrStage(120), 'G1');
  assert.equal(gfrStage(90), 'G1');
  assert.equal(gfrStage(89.9), 'G2');
  assert.equal(gfrStage(60), 'G2');
  assert.equal(gfrStage(59.9), 'G3a');
  assert.equal(gfrStage(45), 'G3a');
  assert.equal(gfrStage(44.9), 'G3b');
  assert.equal(gfrStage(29.9), 'G4');
  assert.equal(gfrStage(14.9), 'G5');
  assert.equal(gfrStage(0), 'G5');
});

/**
 * **No sentence here may tell a person what to do about their body.**
 *
 * A stage is not a diagnosis: chronic kidney disease needs a reduced eGFR sustained over three
 * months plus clinical context, and a single creatinine moves with hydration, a heavy protein meal
 * and hard training. The copy may say a number is outside the usual range and that a doctor should
 * see it; it may not prescribe, reassure, or name a condition.
 */
test('no stage copy asserts a condition or tells anyone what to take', () => {
  /**
   * Written as the CLAIMS that are forbidden, not as words that are. An earlier version of this
   * banned the string "diagnos", which G3a passed only by accident — it says “is not a diagnosis”,
   * which is the opposite of the thing being guarded against. A guard that passes for the wrong
   * reason is a guard that will one day fail to fire.
   */
  const asserts = [
    /\byou have\b/i,
    /\byou (?:should|must|need to)\b/i,
    /\bkidney (?:disease|failure)\b/i,
    /\bchronic kidney\b/i,
    /\b(?:medication|treatment|supplement)s?\b/i,
    /\b(?:normal|healthy|good|bad|poor) (?:result|value|number|level)s?\b/i,
  ];

  for (const [stage, meaning] of Object.entries({ ...STAGE_MEANING, caveat: EGFR_CAVEAT })) {
    for (const claim of asserts) {
      assert.ok(!claim.test(meaning), `${stage} makes a claim it must not (${claim}): "${meaning}"`);
    }
  }
});

/**
 * The other half of the same rule: below the usual range, the copy must hand the reading to a
 * person rather than interpret it. Silence there would be its own kind of claim.
 */
test('every stage below the usual range points at a doctor, and none above it does', () => {
  for (const stage of ['G3a', 'G3b', 'G4', 'G5'] as const) {
    assert.match(STAGE_MEANING[stage], /doctor/i, `${stage} leaves a low reading with the app`);
  }
  for (const stage of ['G1', 'G2'] as const) {
    assert.doesNotMatch(STAGE_MEANING[stage], /doctor/i, `${stage} sends a well person to a doctor`);
  }
});

/** The caveat is not optional decoration — a screen without it turns a reading into a finding. */
test('the caveat names what actually moves a single creatinine', () => {
  for (const cause of ['hydration', 'protein', 'training']) {
    assert.ok(EGFR_CAVEAT.toLowerCase().includes(cause), `the caveat does not mention ${cause}`);
  }
});

/**
 * **The screen must not contradict itself.**
 *
 * `Math.round` and `gfrStage` were both correct and were given different inputs, so wherever
 * rounding crossed a band boundary the number and the sentence under it described different
 * people. The sharp one is the bottom of G2: 59.5 printed as `60`, which this file's own G2 wording
 * calls ordinary, with G3a's "worth a doctor's eyes" underneath it.
 */
test('the band belongs to the number that is printed, at every boundary', () => {
  for (const [value, shown, stage] of [
    [59.5, 60, 'G2'],
    [59.49, 59, 'G3a'],
    [89.6, 90, 'G1'],
    [89.4, 89, 'G2'],
    [44.5, 45, 'G3a'],
    [29.5, 30, 'G3b'],
    [14.5, 15, 'G4'],
  ] as const) {
    const result = gfrAsShown(value);
    assert.equal(result.shown, shown, `${value} printed as ${result.shown}`);
    assert.equal(result.stage, stage, `${result.shown} was staged ${result.stage}`);
    assert.equal(result.stage, gfrStage(result.shown), 'the band must follow the printed number');
  }
});

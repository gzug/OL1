import assert from 'node:assert/strict';
import test from 'node:test';

import { REQUIRED_MARKERS, computePhenoAgeRange } from '../src/application/labs/phenoAge';
import {
  CHOLESTEROL_MMOLL_TO_MGDL,
  TRIGLYCERIDES_MMOLL_TO_MGDL,
  extraToTargetUnit,
} from '../src/application/labs/units';
import { EXTRA_MARKERS, EXTRA_MARKER_KEYS } from '../src/ui/labs/lipids';
import { LEVINE_MARKERS } from '../src/ui/labs/levine';

/**
 * The markers a panel holds that the age calculation does not read.
 *
 * The nine Levine markers are not the nine most interesting numbers in blood — they are the nine
 * one published formula takes. A person tracking their own health measures more, and the owner's
 * own records track ApoB, Lp(a), LDL, HDL and triglycerides.
 */

/**
 * **The assertion this whole separation exists for.**
 *
 * Everything lives in one `markers` object on the panel payload, so a shared key would silently
 * feed a lipid value into the biological age. Held by a test rather than by care.
 */
test('no extra marker shares a key with one the formula reads', () => {
  const levine = new Set(LEVINE_MARKERS.map((marker) => marker.key));

  for (const key of EXTRA_MARKER_KEYS) {
    assert.ok(!levine.has(key as never), `"${key}" would be read by the age calculation`);
  }
});

/** And the calculation must be indifferent to them, however many are recorded. */
test('recording a lipid panel changes the biological age by nothing at all', () => {
  const nine = {
    albumin: 4.4, alp: 62, creatinine: 0.9, crp: 0.8, glucose: 88,
    lymph_pct: 31, mcv: 89, rdw: 12.8, wbc: 5.6,
  };
  const withLipids = { ...nine, apob: 90, hdl: 55, ldl: 120, total_cholesterol: 195, triglycerides: 100 };

  const plain = computePhenoAgeRange({ chronologicalAge: 33, markers: nine });
  const richer = computePhenoAgeRange({ chronologicalAge: 33, markers: withLipids as never });

  assert.deepEqual(richer, plain, 'a fuller panel must not move a number it does not feed');
  assert.equal(REQUIRED_MARKERS.length, 9, 'the formula still reads exactly nine');
});

/**
 * **Cholesterol and triglycerides do not share a conversion factor**, and using one for both is the
 * commonest mistake in reading a lipid panel — it puts triglycerides out by more than double.
 */
test('the two mmol/L factors are different, and applied to the right markers', () => {
  assert.notEqual(CHOLESTEROL_MMOLL_TO_MGDL, TRIGLYCERIDES_MMOLL_TO_MGDL);

  for (const key of ['total_cholesterol', 'ldl', 'hdl'] as const) {
    assert.equal(extraToTargetUnit(key, 5.2, 'mmol/L'), 5.2 * CHOLESTEROL_MMOLL_TO_MGDL, key);
  }
  assert.equal(
    extraToTargetUnit('triglycerides', 1.7, 'mmol/L'),
    1.7 * TRIGLYCERIDES_MMOLL_TO_MGDL,
    'triglycerides took the cholesterol factor — out by more than double',
  );
});

test('a unit already in the stored one passes through, and an unknown one is refused', () => {
  assert.equal(extraToTargetUnit('ldl', 120, 'mg/dL'), 120);
  assert.equal(extraToTargetUnit('apob', 0.9, 'g/L'), 90, '1 g/L is exactly 100 mg/dL');
  assert.equal(extraToTargetUnit('vitamin_d', 75, 'nmol/L'), 75 / 2.496);

  assert.equal(extraToTargetUnit('ldl', 120, 'furlongs'), null);
});

/**
 * **Lp(a) in mmol/L is deliberately refused.**
 *
 * The factor between `nmol/L` and `mg/dL` depends on the particle's size, which differs between
 * people — there is no single correct number, and laboratories say so themselves. Refusing is the
 * only honest answer, the same refusal `cells/µL` gets for white cells.
 */
test('Lp(a) refuses a conversion nobody can do correctly', () => {
  assert.equal(extraToTargetUnit('lpa', 50, 'mg/dL'), null);
  assert.equal(extraToTargetUnit('lpa', 50, 'nmol/L'), 50, 'its own unit still passes through');
});

/** Every extra marker says what it is, in the same words `markerContext` uses for the nine. */
test('every extra marker is described, and none of them diagnoses', () => {
  /**
   * **Judgements about a value, not words that happen to appear in one.**
   *
   * A first draft banned `high` and `low` outright and fired on *low-density lipoprotein* and
   * *high-density* — the particles' own names, and the opposite of a judgement. Tuned here in a
   * visible diff, per `AGENTS.md`, rather than reworded around: what is forbidden is calling
   * somebody's number good or bad, and a hyphenated compound is not doing that.
   */
  const claims = [
    /\byou (?:have|should|need)\b/i,
    /(?<!-)\b(?:high|low|normal|healthy|good|bad|optimal)\b(?!-)/i,
    /\brisk\b/i,
    /\btreat|medication|supplement/i,
  ];

  for (const marker of EXTRA_MARKERS) {
    assert.ok(marker.what.length > 20, `${marker.key} has no description`);
    assert.ok(marker.unit.length > 0, `${marker.key} has no unit`);
    assert.ok(marker.sane.min < marker.sane.max, `${marker.key} has impossible bounds`);

    for (const claim of claims) {
      assert.ok(!claim.test(marker.what), `${marker.key} makes a claim it must not: "${marker.what}"`);
    }
  }
});

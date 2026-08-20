import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALTERNATE_UNIT,
  TARGET_UNIT,
  boundsIn,
  normUnit,
  toTargetUnit,
} from '../src/application/labs/units';
import { LEVINE_MARKERS } from '../src/ui/labs/levine';

/**
 * The Levine formula takes American units and a European panel reports three of the nine
 * differently. Typed raw, those produce a biological age that is confidently wrong — which is the
 * single most likely way this app tells somebody something untrue about themselves.
 */

test('the three that differ on a European panel convert correctly', () => {
  // Albumin 45 g/L is 4.5 g/dL.
  assert.equal(toTargetUnit('albumin', 45, 'g/L'), 4.5);
  // Creatinine 88.4 µmol/L is exactly 1 mg/dL.
  assert.equal(toTargetUnit('creatinine', 88.4, 'µmol/L'), 1);
  // Glucose 5 mmol/L is about 90 mg/dL.
  assert.ok(Math.abs((toTargetUnit('glucose', 5, 'mmol/L') ?? 0) - 90.09) < 0.01);
  // CRP 0.5 mg/dL is 5 mg/L.
  assert.equal(toTargetUnit('crp', 0.5, 'mg/dL'), 5);
});

test('a value already in the target unit passes through untouched', () => {
  for (const marker of LEVINE_MARKERS) {
    assert.equal(toTargetUnit(marker.key, 7, marker.unit), 7);
  }
});

/**
 * THE REFUSAL WORTH KEEPING — Legacy's own. White cells in `cells/µL` differ from `10³/µL` by a
 * factor of a thousand. A silent mis-scale by 1000 is far worse than a value the screen declines,
 * so that conversion is absent rather than guessed.
 */
test('white cells in an absolute count are refused, not mis-scaled by a thousand', () => {
  assert.equal(toTargetUnit('wbc', 6500, 'cells/µL'), null);
  assert.equal(toTargetUnit('wbc', 6.5, '10⁹/L'), 6.5, 'the units that ARE identical pass through');
  assert.equal(toTargetUnit('wbc', 6.5, 'K/uL'), 6.5);
});

test('an unknown unit is refused rather than assumed', () => {
  assert.equal(toTargetUnit('glucose', 5, 'furlongs'), null);
  assert.equal(toTargetUnit('albumin', 45, ''), null);
});

/**
 * Legacy's note: a European panel typed with `µ`, or one read by OCR, would otherwise fail to
 * convert and read as missing. Case, spacing and superscripts are folded for the same reason.
 */
test('real-world spellings of a unit all match', () => {
  assert.equal(normUnit('µmol/L'), 'umol/l');
  assert.equal(normUnit(' MMOL/L '), 'mmol/l');
  assert.equal(normUnit('10³/µL'), '103/ul');
  assert.equal(toTargetUnit('creatinine', 88.4, 'UMOL/L'), 1);
  assert.equal(toTargetUnit('creatinine', 88.4, ' µmol / L '), 1);
});

/** The screen has to state the sane range in whichever unit is being typed, or it reads as nonsense. */
test('a sane range is restated in the unit being entered', () => {
  const albumin = LEVINE_MARKERS.find((marker) => marker.key === 'albumin');
  assert.ok(albumin !== undefined);

  const inGramsPerLitre = boundsIn('albumin', albumin.sane, 'g/L');
  assert.deepEqual(inGramsPerLitre, { max: 70, min: 10 }, '1–7 g/dL is 10–70 g/L');

  assert.deepEqual(boundsIn('albumin', albumin.sane, 'g/dL'), albumin.sane);
  assert.equal(boundsIn('albumin', albumin.sane, 'furlongs'), null);
});

test('every marker names a target unit, and the alternates are real conversions', () => {
  for (const marker of LEVINE_MARKERS) {
    assert.equal(marker.unit, TARGET_UNIT[marker.key], 'the screen and the formula disagree');
  }
  for (const [key, unit] of Object.entries(ALTERNATE_UNIT)) {
    assert.ok(
      toTargetUnit(key as keyof typeof TARGET_UNIT, 1, unit as string) !== null,
      `"${unit}" is offered for ${key} but cannot be converted`,
    );
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { MACROS, mealPayload } from '../src/ui/meals/nutrition';
import { LEVINE_MARKERS, panelPayload } from '../src/ui/labs/levine';

const meal = (values: Record<string, string>) =>
  MACROS.map((macro) => ({ key: macro.key, text: values[macro.key] ?? '' }));

const panel = (values: Record<string, string>) =>
  LEVINE_MARKERS.map((marker) => ({ key: marker.key, text: values[marker.key] ?? '' }));

/**
 * The one rule both of these exist to hold: **a blank is absent, never zero.**
 *
 * It is Legacy's own, from the line in its parser that drops fibre — "fiber stays null when absent
 * or invalid - honesty rule, never fabricate". A zero is a claim that the meal contained none, and a
 * week of averages built on those zeros is wrong in the direction that flatters.
 */
test('a macro left blank is absent from the stored meal, not a zero', () => {
  const payload = mealPayload(meal({ calories: '600', proteinGrams: '35' }), '');
  const macros = payload.macros as Record<string, number>;

  assert.deepEqual(macros, { calories: 600, proteinGrams: 35 });
  assert.equal('fiberGrams' in macros, false, 'an unknown macro became a number');
});

test('a macro that is not a number is dropped rather than stored as one', () => {
  const macros = mealPayload(meal({ calories: 'about 600' }), '').macros as Record<string, number>;
  assert.deepEqual(macros, {});
});

/**
 * Legacy's sanity ranges are not reference ranges — they are the limits outside which a number is a
 * typo or a wrong unit. A value outside them is refused by the screen, and refused again here so
 * that nothing can write one past the screen.
 */
test('a macro outside its sane range never reaches the store', () => {
  const macros = mealPayload(meal({ calories: '99999' }), '').macros as Record<string, number>;
  assert.equal('calories' in macros, false);
});

test('the note is kept when there is one, and absent when there is not', () => {
  assert.equal(mealPayload(meal({ calories: '600' }), '  fried in butter  ').note, 'fried in butter');
  assert.equal('note' in mealPayload(meal({ calories: '600' }), '   '), false);
});

test('a marker left blank is absent from the stored panel, not a zero', () => {
  const payload = panelPayload(panel({ albumin: '4.2' }), 'manual', '2026-08-19T10:00:00.000Z');
  const markers = payload.markers as Record<string, number>;

  assert.deepEqual(markers, { albumin: 4.2 });
  assert.equal('crp' in markers, false, 'an unmeasured marker became a zero');
});

/**
 * The Verification Gate is the whole point of the lab screen. A panel that reached storage without
 * a person confirming it would be indistinguishable from one that did, and this is the field that
 * tells them apart afterwards.
 */
test('an approved panel records that it was approved, and by which way it was read', () => {
  const payload = panelPayload(panel({ albumin: '4.2' }), 'photo', '2026-08-19T10:00:00.000Z');

  assert.equal(payload.approvedAt, '2026-08-19T10:00:00.000Z');
  assert.equal(payload.readBy, 'photo');
});

test('an impossible marker value is refused rather than stored', () => {
  const markers = panelPayload(panel({ albumin: '900' }), 'manual', '2026-08-19T10:00:00.000Z')
    .markers as Record<string, number>;
  assert.equal('albumin' in markers, false);
});

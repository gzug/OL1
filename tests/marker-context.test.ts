import assert from 'node:assert/strict';
import test from 'node:test';

import { LEVINE_MARKERS } from '../src/ui/labs/levine';
import { MARKER_CONTEXT, markerContext } from '../src/ui/labs/markerContext';

/**
 * PORTED RULES — Legacy `data/markerContext.ts` states them at the top of its own file:
 * no diagnosis, no treatment advice, no "you should", no risk prediction.
 *
 * Legacy trusted a careful author. This does not: the rules are checked, because AGENTS.md is right
 * that a rule worth having is a check, and because the next person to add a marker will be adding
 * one at speed. Health copy is exactly where "somebody will notice in review" is not good enough.
 */

const ALL_TEXT = MARKER_CONTEXT.flatMap((entry) => [entry.what, entry.why, entry.alongside]);

test('every marker on our panel has context, and nothing else does', () => {
  const ours = LEVINE_MARKERS.map((marker) => marker.key).sort();
  const covered = MARKER_CONTEXT.map((entry) => entry.key).sort();

  assert.deepEqual(covered, ours, 'a marker is on the panel with nothing to say about it');
  for (const marker of LEVINE_MARKERS) {
    assert.ok(markerContext(marker.key) !== undefined, `"${marker.key}" has no context`);
  }
});

/** No diagnosis. The word itself, and the shapes that mean it without using it. */
test('nothing here diagnoses anybody', () => {
  const banned = /\b(diagnos\w*|disease|disorder|syndrome|deficien\w*|abnormal|patholog\w*)\b/i;
  for (const text of ALL_TEXT) {
    assert.equal(banned.exec(text), null, `"${banned.exec(text)?.[0]}" appears in: ${text}`);
  }
});

/** No treatment advice, and no instruction of any kind. */
test('nothing here tells anybody what to do', () => {
  const banned = /\b(you should|you need|you must|make sure|try to|aim for|increase your|reduce your|avoid|take a supplement|treatment)\b/i;
  for (const text of ALL_TEXT) {
    assert.equal(banned.exec(text), null, `"${banned.exec(text)?.[0]}" appears in: ${text}`);
  }
});

/** No risk prediction. A marker is a measurement, not a forecast about a person. */
test('nothing here predicts anything about anybody', () => {
  const banned = /\b(risk of|likelihood of|chance of|predicts?|linked to (?:heart|cancer|death)|associated with (?:heart|cancer|death)|life expectancy)\b/i;
  for (const text of ALL_TEXT) {
    assert.equal(banned.exec(text), null, `"${banned.exec(text)?.[0]}" appears in: ${text}`);
  }
});

/**
 * No number is safe here. A reference range, a threshold or a "normal is" turns a description into
 * a verdict on whatever the reader's own value happens to be — and the panel screen shows that
 * value right beside this text.
 */
test('no context carries a number, a range or a unit', () => {
  const banned = /\b\d+(\.\d+)?\s*(mg|g|dl|l|ml|mmol|umol|µmol|%|fl|ng|iu)\b|\bnormal (?:is|range)\b|\bhealthy (?:is|range)\b/i;
  for (const text of ALL_TEXT) {
    assert.equal(banned.exec(text), null, `"${banned.exec(text)?.[0]}" appears in: ${text}`);
  }
});

/**
 * `why` says the marker is here because a formula reads it. That is the honest reason — these nine
 * are not "the numbers that matter most about you", they are the numbers one published calculation
 * takes — and if that sentence drifts, the panel starts implying the first thing.
 */
test('every marker says why it is on this panel at all', () => {
  for (const entry of MARKER_CONTEXT) {
    assert.ok(entry.why.length > 0, `"${entry.key}" does not say why it is here`);
    assert.match(
      entry.why,
      /biological age calculation/,
      `"${entry.key}" stopped saying that the age calculation is what reads it`,
    );
  }
});

test('every marker actually says something', () => {
  for (const entry of MARKER_CONTEXT) {
    assert.ok(entry.what.length > 20, `"${entry.key}" has no description worth reading`);
    assert.ok(entry.alongside.length > 10, `"${entry.key}" does not say what it is read with`);
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SAME_WEIGHT_KG,
  SILENCE_WORDS,
  domainSummaries,
  exerciseSummary,
  healthSummary,
  nutritionSummary,
  unbuiltSummaries,
  weightMoved,
  whatMoved,
} from '../src/ui/twin/summaries';

const NOW = '2026-08-22T09:00:00.000Z';

function ago(days: number): string {
  return new Date(Date.parse(NOW) - days * 86_400_000).toISOString();
}

let n = 0;
function entry(
  hubId: string,
  kind: string,
  payload: Readonly<Record<string, unknown>> = {},
  daysAgo = 1,
) {
  return { hubId, id: `e${(n += 1)}`, kind, payload, recordedAt: ago(daysAgo), source: 'manual' };
}

/* ── A domain that knows nothing says why ──────────────────────────────────────────────────── */

/**
 * THE LINE THIS WHOLE SCREEN TURNS ON. Two of the five domains cannot compute anything and will not
 * be able to until a phone and a wearable exist. Hiding them would make the twin look complete;
 * naming them is what shows a person what it is still missing.
 */
test('sleep and resilience say nothing, and say it is not the person’s fault', () => {
  const quiet = unbuiltSummaries();

  assert.deepEqual(quiet.map((summary) => summary.hubId), ['sleep', 'resilience']);
  for (const summary of quiet) {
    assert.equal(summary.said, 'nothing');
    if (summary.said !== 'nothing') return;
    assert.equal(summary.why, 'notBuilt', 'this blames the person for a gap that is ours');
  }
});

/**
 * The two silences are different and must read differently. One is fixable by logging something; the
 * other cannot be fixed by anybody using the app today, and telling somebody to log their sleep in an
 * app that cannot read sleep would be blaming them for our gap.
 */
test('an empty domain and an unbuilt one do not say the same thing', () => {
  assert.notEqual(SILENCE_WORDS.nothingLogged, SILENCE_WORDS.notBuilt);
  assert.match(SILENCE_WORDS.notBuilt, /cannot read/i);
  assert.doesNotMatch(SILENCE_WORDS.notBuilt, /\blog\b|\badd\b/i, 'it asks for something impossible');
});

test('a domain with nothing logged says so rather than inventing a zero', () => {
  const health = healthSummary([], NOW);
  assert.equal(health.said, 'nothing');
  if (health.said !== 'nothing') return;
  assert.equal(health.why, 'nothingLogged');

  assert.equal(exerciseSummary([], NOW).said, 'nothing');
  assert.equal(nutritionSummary([], NOW).said, 'nothing');
});

/* ── What each one says when it has something ──────────────────────────────────────────────── */

/**
 * The biological age is deliberately absent from this card. It leads the whole screen, under the
 * body, because the spec says the drift number leads the Twin — and the same claim twice is two
 * claims that drift apart the first time one of them changes.
 */
test('the health card dates the blood and never repeats the number', () => {
  const summary = healthSummary([entry('medical', 'panel', { markers: {} }, 40)], NOW);

  assert.equal(summary.said, 'something');
  if (summary.said !== 'something') return;
  assert.match(summary.headline, /^Blood drawn /);
  assert.doesNotMatch(summary.headline, /\d+\.\d/, 'a biological age leaked into the card');
});

test('a note beside a panel is counted, and no note is not a zero', () => {
  const withNote = healthSummary(
    [entry('medical', 'panel', {}, 30), entry('medical', 'note', { text: 'x' }, 10)],
    NOW,
  );
  assert.equal(withNote.said, 'something');
  if (withNote.said !== 'something') return;
  assert.equal(withNote.detail, '1 other note');

  const bare = healthSummary([entry('medical', 'panel', {}, 30)], NOW);
  assert.equal(bare.said, 'something');
  if (bare.said !== 'something') return;
  assert.equal(bare.detail, null, 'a zero was printed where nothing belonged');
});

/**
 * Four separate days is the floor for saying anything about "this week" — `weekly.ts` sets it and
 * this reads it rather than inventing a second rule. Below the floor the card talks about the
 * window instead, which is true either way.
 */
test('the exercise card only says “this week” when a week may be claimed', () => {
  const thin = exerciseSummary([entry('exercise', 'session', { minutes: 40 }, 1)], NOW);
  assert.equal(thin.said, 'something');
  if (thin.said !== 'something') return;
  assert.match(thin.headline, /recorded$/, 'one session claimed a week');

  const spread = exerciseSummary(
    [1, 2, 3, 4].map((day) => entry('exercise', 'session', { minutes: 30 }, day)),
    NOW,
  );
  assert.equal(spread.said, 'something');
  if (spread.said !== 'something') return;
  assert.match(spread.headline, /this week$/);
});

test('the exercise card carries a strip only when there is something to draw', () => {
  const summary = exerciseSummary([entry('exercise', 'session', { minutes: 40 }, 3)], NOW);
  assert.equal(summary.said, 'something');
  if (summary.said !== 'something') return;
  assert.ok(summary.strip !== null, 'a session was logged and the twelve weeks drew nothing');
});

test('nutrition leads with the last weigh-in, and with meals when there is none', () => {
  const weighed = nutritionSummary(
    [entry('nutrition', 'weight', { kg: 76.4 }, 2), entry('nutrition', 'meal', {}, 1)],
    NOW,
  );
  assert.equal(weighed.said, 'something');
  if (weighed.said !== 'something') return;
  assert.equal(weighed.headline, '76.4 kg');

  const mealsOnly = nutritionSummary([entry('nutrition', 'meal', {}, 1)], NOW);
  assert.equal(mealsOnly.said, 'something');
  if (mealsOnly.said !== 'something') return;
  assert.match(mealsOnly.headline, /meal/);
});

/** The newest weigh-in, not the first one found. A stale weight is a wrong claim about a body. */
test('nutrition uses the most recent weigh-in', () => {
  const summary = nutritionSummary(
    [entry('nutrition', 'weight', { kg: 80 }, 60), entry('nutrition', 'weight', { kg: 76.4 }, 2)],
    NOW,
  );
  assert.equal(summary.said, 'something');
  if (summary.said !== 'something') return;
  assert.equal(summary.headline, '76.4 kg');
});

/* ── All of them together ──────────────────────────────────────────────────────────────────── */

/**
 * THE ONE THAT SHIPPED. `LabUploadFlow` writes every panel to the `labs` hub, which sits inside
 * Health record on the ring. Reading `medical` alone told somebody "nothing logged here yet" while
 * the biological age directly above was computed from the panel they were being told they had not
 * added. Both halves were individually correct, which is why nothing in CI saw it.
 */
test('a panel in Labs reaches the Health record card', () => {
  const withPanel = domainSummaries(
    { labs: [entry('labs', 'panel', { markers: {} }, 30)] },
    [],
    NOW,
  );
  const health = withPanel.find((summary) => summary.hubId === 'medical');

  assert.ok(health !== undefined);
  assert.equal(health.said, 'something', 'a panel one hub down went unseen');
  if (health.said !== 'something') return;
  assert.match(health.headline, /^Blood drawn /);
});

test('every domain gets a card, in the order the twin reads them', () => {
  const all = domainSummaries({}, [], NOW);
  assert.deepEqual(
    all.map((summary) => summary.hubId),
    ['medical', 'exercise', 'nutrition', 'sleep', 'resilience'],
  );
});

/**
 * Putting a hub away is a statement about what somebody wants to see. It would be a strange app that
 * honoured that on the ring and ignored it on the screen the ring points at.
 */
test('a hub put away is not summarised', () => {
  const all = domainSummaries({}, ['sleep'], NOW);
  assert.ok(!all.some((summary) => summary.hubId === 'sleep'));
  assert.equal(all.length, 4);
});

/** An empty store is five honest cards, not five blanks and not a claim that anything is wrong. */
test('an empty store still shows every domain, each saying what it is waiting for', () => {
  const all = domainSummaries({}, [], NOW);

  for (const summary of all) {
    assert.equal(summary.said, 'nothing');
    if (summary.said !== 'nothing') return;
    assert.ok(SILENCE_WORDS[summary.why].length > 0);
  }
});

/* ── What moved since last time ────────────────────────────────────────────────────────────── */

/**
 * A DIRECTION NEEDS TWO POINTS. One panel is a reading; calling it a movement invents a direction
 * from a single measurement, which is the shape of error this repository keeps finding.
 */
test('one panel has moved nowhere, because there is nothing to have moved from', () => {
  assert.equal(whatMoved([]), null);
  assert.equal(whatMoved([entry('labs', 'panel', { markers: { crp: 1 } }, 30)]), null);
});

test('a marker that moved is named, with its direction and no verdict', () => {
  const line = whatMoved([
    entry('labs', 'panel', { markers: { crp: 1.0 } }, 200),
    entry('labs', 'panel', { markers: { crp: 2.0 } }, 10),
  ]);

  assert.ok(line !== null);
  assert.match(line, /up/i, 'the direction went missing');
  assert.doesNotMatch(
    line,
    /\b(better|worse|improved|worsened|good|bad|healthy|risk)\b/i,
    'a summary card started making a clinical judgement',
  );
});

/**
 * A move too small to call is shown as a pair of numbers on the Labs hub and described nowhere. A
 * one-line card has no room for that nuance, so it says nothing rather than something it cannot
 * qualify.
 */
test('a move too small to call is not described as a move', () => {
  const line = whatMoved([
    entry('labs', 'panel', { markers: { crp: 1.0 } }, 200),
    entry('labs', 'panel', { markers: { crp: 1.02 } }, 10),
  ]);

  assert.equal(line, 'Nothing moved much since the one before');
});

/* ── Weight ────────────────────────────────────────────────────────────────────────────────── */

test('one weigh-in has no direction', () => {
  assert.equal(weightMoved([entry('nutrition', 'weight', { kg: 76.4 }, 1)]), null);
});

test('a real change names its direction and size', () => {
  const down = weightMoved([
    entry('nutrition', 'weight', { kg: 76.4 }, 1),
    entry('nutrition', 'weight', { kg: 77.1 }, 30),
  ]);
  assert.equal(down, 'Down 0.7 kg since the one before');

  const up = weightMoved([
    entry('nutrition', 'weight', { kg: 78 }, 1),
    entry('nutrition', 'weight', { kg: 77.1 }, 30),
  ]);
  assert.match(up ?? '', /^Up 0\.9 kg/);
});

/**
 * A bathroom scale does not agree with itself across a day. Reporting a hundred grams as a direction
 * turns noise into a trend — the same refusal `MEANINGFUL_CHANGE` makes about blood, applied to a
 * different instrument.
 */
test('a move smaller than the scale is level, not a trend', () => {
  const line = weightMoved([
    entry('nutrition', 'weight', { kg: 76.4 }, 1),
    entry('nutrition', 'weight', { kg: 76.5 }, 30),
  ]);

  assert.equal(line, 'Level since the one before');
  assert.ok(SAME_WEIGHT_KG > 0.1, 'the floor is below what a scale can disagree with itself by');
});

/** The card leads with the weight and the change is what sits under it, not the other way round. */
test('the nutrition card keeps the weight as its headline and the direction underneath', () => {
  const summary = nutritionSummary(
    [
      entry('nutrition', 'weight', { kg: 76.4 }, 1),
      entry('nutrition', 'weight', { kg: 77.1 }, 30),
      entry('nutrition', 'meal', {}, 1),
    ],
    NOW,
  );

  assert.equal(summary.said, 'something');
  if (summary.said !== 'something') return;
  assert.equal(summary.headline, '76.4 kg');
  assert.equal(summary.detail, 'Down 0.7 kg since the one before');
});

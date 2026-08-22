import assert from 'node:assert/strict';
import test from 'node:test';

import type { HubEntry } from '../src/core/hubs';
import { coverageFor } from '../src/ui/hubs/coverage';
import type { HubFacet } from '../src/ui/hubs/hubState';
import { HUB_STATES } from '../src/ui/hubs/states';
import { LEVINE_MARKERS } from '../src/ui/labs/levine';

/**
 * What each hub can and cannot see. **Every value here is invented.**
 *
 * Coverage was the last invented block on a hub screen, and the one where being invented mattered
 * most: its entire job is to say what the hub reads, so a sample row claiming a capability lies
 * about the app's shape rather than about a number.
 */

const NOW = '2026-08-22T21:00:00.000Z';

const entry = (
  hubId: string,
  kind: string,
  day: string,
  payload: Readonly<Record<string, unknown>> = {},
): HubEntry => ({
  hubId,
  id: `${kind}-${day}`,
  kind,
  payload,
  recordedAt: `${day}T08:00:00.000Z`,
  source: 'manual',
});

test('a hub with nothing real yet falls back to its fixture', () => {
  assert.equal(coverageFor('medical', [], NOW), null);
  assert.equal(coverageFor('a-hub-somebody-made', [], NOW), null);
});

/**
 * **The two rows that claimed to be reading and read nothing.** Resilience's coverage said
 * "6 of the last 7 nights" for heart-rate variability and resting heart rate, in the reading state,
 * on the block whose only job is to say what this hub can see. Both need a watch.
 */
test('Resilience stops claiming to read a watch it has never had', () => {
  const facets = coverageFor('resilience', [], NOW);
  assert.ok(facets !== null);

  for (const label of ['Heart-rate variability', 'Resting heart rate']) {
    const facet: HubFacet | undefined = facets.find((row) => row.label === label);
    assert.ok(facet !== undefined, label);
    assert.equal(facet.state, 'missing', `${label} still claims to be reading`);
    assert.match(facet.detail, /watch/i);
  }

  /* And the half that needs no watch says how much of it there is. */
  const described: HubFacet | undefined = coverageFor(
    'resilience',
    [
      entry('resilience', 'day', '2026-08-22', { word: 'steady' }),
      entry('resilience', 'day', '2026-08-21', { word: 'tired' }),
      entry('resilience', 'day', '2026-08-20', { word: 'elated' }),
    ],
    NOW,
  )?.find((row) => row.label === 'How the day felt');

  assert.ok(described !== undefined);
  assert.equal(described.state, 'reading');
  assert.equal(described.detail, '2 of the last 7 days, in your words');
});

test('an empty hub says it is empty rather than claiming a count', () => {
  for (const hubId of ['exercise', 'labs', 'nutrition', 'resilience', 'sleep']) {
    const facets = coverageFor(hubId, [], NOW);
    assert.ok(facets !== null, hubId);
    assert.ok(
      facets.every((facet) => facet.state !== 'reading'),
      `"${hubId}" claims to be reading something with nothing in it`,
    );
    for (const facet of facets) {
      assert.ok(facet.detail.length > 0, `"${hubId}" has a facet with no detail`);
    }
  }
});

test('Exercise names the week and the types actually in it', () => {
  const facets = coverageFor(
    'exercise',
    [
      entry('exercise', 'session', '2026-08-22', { activity: 'running', minutes: 52 }),
      entry('exercise', 'session', '2026-08-21', { activity: 'gym', minutes: 65 }),
      entry('exercise', 'session', '2026-08-21', { activity: 'running', minutes: 30 }),
      entry('exercise', 'session', '2026-07-01', { activity: 'golf', minutes: 200 }),
    ],
    NOW,
  );

  assert.deepEqual(facets?.[0], {
    detail: '3 in the last 7 days, across 2 of them',
    label: 'Sessions',
    state: 'reading',
  });
  /* In the order `SESSION_TYPES` lists them, and golf is outside the window so it is not named. */
  assert.deepEqual(facets?.[1], {
    detail: 'Running, Gym',
    label: 'Exercise types',
    state: 'reading',
  });
});

/**
 * **One panel is a point.** Trends stays `missing` at one panel and says what would change it —
 * the same sentence `PanelAge` and the Twin both make, with the count behind it.
 */
test('Labs counts the markers it holds and refuses a trend from one panel', () => {
  const markers = Object.fromEntries(LEVINE_MARKERS.map((m) => [m.key, m.sane.min + 1]));

  const one = coverageFor('labs', [entry('labs', 'panel', '2026-08-01', { markers })], NOW);
  assert.deepEqual(one?.[0], {
    detail: '9 markers on your last panel',
    label: 'Blood panel',
    state: 'reading',
  });
  assert.deepEqual(one?.[1], {
    detail: 'One panel is a reading. A second makes it a line',
    label: 'Trends',
    state: 'missing',
  });

  const two = coverageFor(
    'labs',
    [
      entry('labs', 'panel', '2026-08-01', { markers }),
      entry('labs', 'panel', '2026-02-01', { markers }),
    ],
    NOW,
  );
  const trends: HubFacet | undefined = two?.[1];
  assert.ok(trends !== undefined);
  assert.equal(trends.state, 'reading');
  assert.match(trends.detail, /^2 panels/);
});

test('Nutrition counts meals in the week and weigh-ins on file', () => {
  const facets = coverageFor(
    'nutrition',
    [
      entry('nutrition', 'meal', '2026-08-22', { macros: { calories: 500 } }),
      entry('nutrition', 'meal', '2026-08-20', { macros: { calories: 700 } }),
      entry('nutrition', 'weight', '2026-08-18', { kg: 82 }),
    ],
    NOW,
  );

  assert.equal(facets?.[0]?.detail, '2 logged across 2 of the last 7 days');
  assert.deepEqual(
    facets?.find((facet) => facet.label === 'Weight'),
    { detail: '1 on file, at most one a day', label: 'Weight', state: 'reading' },
  );
  /* A meal records five macros and no vitamins. The fixture pointed at a lab report instead. */
  assert.equal(facets?.find((facet) => facet.label === 'Micronutrients')?.state, 'missing');
});

test('Sleep says the nights are typed in, not measured', () => {
  const facets = coverageFor(
    'sleep',
    [entry('sleep', 'night', '2026-08-22', { minutes: 445 })],
    NOW,
  );

  assert.deepEqual(facets?.[0], {
    detail: '1 of the last 7 nights, typed in by you',
    label: 'Time asleep',
    state: 'reading',
  });
});

/**
 * The fixtures keep their coverage rows for the hub that still needs them, and `HubScreen` falls
 * back to those. This asserts the fallback has something to fall back TO.
 */
test('every hub still states some coverage, real or sample', () => {
  for (const [id, state] of Object.entries(HUB_STATES)) {
    const real = coverageFor(id, [], NOW);
    assert.ok(
      (real ?? state.facets).length > 0,
      `"${id}" would render a Coverage heading over nothing`,
    );
  }
});

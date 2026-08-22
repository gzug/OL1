import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDuration } from '../src/application/format/metric';
import { isDomainHub, orbitHubs } from '../src/ui/hubs/catalog';
import { SAMPLE_DATA_LINE } from '../src/ui/hubs/hubState';
import { HUB_STATES, hubStateFor } from '../src/ui/hubs/states';
import { LEVINE_MARKERS } from '../src/ui/labs/levine';
import { EXTRA_MARKERS } from '../src/ui/labs/lipids';

/**
 * A hub's cockpit is hand-written per hub, so nothing here can be checked by the type system beyond
 * its shape. These assertions are about the claims the screen makes: that a strip is really a week,
 * that a hub with nothing says so instead of rendering blank, and that no fixture wanders into
 * naming a lab marker on a public preview.
 */

/**
 * Every DOMAIN hub, not every place on the ring. The Open Table sits there too and deliberately has
 * no cockpit — it holds no data of its own, it is the way to reach every coach. `hub-catalog.test`
 * asserts that absence from the other side, so neither can drift alone.
 */
test('every domain hub in the orbit has a cockpit written for it', () => {
  for (const hub of orbitHubs().filter(isDomainHub)) {
    assert.ok(hubStateFor(hub.id) !== undefined, `hub "${hub.id}" is on the ring with no state`);
  }
});

test('a cockpit either reports periods or says why it is empty, never neither', () => {
  for (const [id, state] of Object.entries(HUB_STATES)) {
    const hasPeriods = state.cockpit.periods.length > 0;
    const explains = state.cockpit.empty !== undefined;
    assert.ok(
      hasPeriods || explains,
      `"${id}" has no cockpit periods and no sentence explaining the absence — it renders blank`,
    );
  }
});

test('a week strip is seven days, and every bar is a fraction', () => {
  for (const [id, state] of Object.entries(HUB_STATES)) {
    const week = state.cockpit.week;
    if (week === undefined) continue;

    assert.equal(week.days.length, 7, `"${id}" calls it a week and shows ${week.days.length} days`);
    assert.ok(week.caption.length > 0, `"${id}" has a strip with no caption to disambiguate a gap`);
    for (const day of week.days) {
      assert.ok(day.fill >= 0 && day.fill <= 1, `"${id}" has a bar at ${day.fill}, outside 0 to 1`);
    }
  }
});

test('every hub states its coverage, including the hubs that read nothing', () => {
  for (const [id, state] of Object.entries(HUB_STATES)) {
    assert.ok(state.facets.length > 0, `"${id}" claims no coverage at all`);
    for (const facet of state.facets) {
      assert.ok(facet.detail.length > 0, `"${id}" has a facet "${facet.label}" with no detail`);
    }
  }
});

/**
 * An observation is an interpretation, and it is only allowed to stand on a stated basis. Mind has
 * neither, deliberately: nothing is connected, so there is nothing to observe. What must never
 * happen is one without the other.
 */
test('an observation never appears without the basis it rests on', () => {
  for (const [id, state] of Object.entries(HUB_STATES)) {
    if (state.observation === undefined) continue;
    assert.ok(state.basis !== undefined, `"${id}" makes an observation with no stated basis`);
  }
});

/**
 * The repository is public and these are invented fixtures. Counts, dates and durations are fine;
 * a named marker with a value would read as somebody's result. This is a blunt check on the words
 * most likely to slip in, not a claim to catch everything.
 */
test('no fixture names a clinical marker or a diagnosis', () => {
  const banned = /\b(mmol|mg\/dL|ng\/mL|hba1c|ldl|hdl|cholesterol|glucose|crp|tsh|diagnos)/i;

  for (const [id, state] of Object.entries(HUB_STATES)) {
    const text = [
      state.observation ?? '',
      state.basis ?? '',
      state.cockpit.empty ?? '',
      ...state.cockpit.periods.flatMap((p) => p.rows.flatMap((r) => [r.label, r.value, r.when])),
      ...state.facets.flatMap((f) => [f.label, f.detail]),
    ].join(' ');

    const hit = banned.exec(text);
    assert.equal(hit, null, `"${id}" fixture contains "${hit?.[0]}", which reads as a lab result`);
  }
});

/**
 * The line that separates a person's own results from the invented ones.
 *
 * It used to be the last line of `StoredEntries` and it read "everything below this is sample
 * data". True when the stored-entry list was the only real block on a hub screen — and false the
 * moment the logged week, the panel's age, kidney function and the marker list appeared underneath
 * it, at which point it was calling a person's own blood results invented.
 *
 * A boundary marker that is not at the boundary is worse than none, because it teaches people to
 * distrust the true half. These assertions are about the sentence, not its position — but they fail
 * loudly if anyone reintroduces a second copy of it somewhere that can drift.
 */
test('the sample-data line says which side is which, and claims nothing about above it', () => {
  assert.match(SAMPLE_DATA_LINE, /below/i, 'it must say WHICH side is invented');
  assert.match(SAMPLE_DATA_LINE, /sample|invented/i);
  assert.doesNotMatch(SAMPLE_DATA_LINE, /\byours\b/i, 'ownership belongs on the real block, not here');
});

/**
 * Comments are not claims.
 *
 * The first version of this guard read the raw file and fired on the doc comment in
 * `StoredEntries` that EXPLAINS the old sentence — so it went red on the description of the bug
 * rather than on the bug. Tuned here in a visible diff, per `AGENTS.md`, rather than worked around:
 * what the guard means is "no component renders a competing claim", and code is where claims live.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** One copy, in the layer that owns the vocabulary of fixtures. */
test('the sample-data line is defined once, outside the component that renders it', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (path: string) => stripComments(readFileSync(path, 'utf8'));

  assert.ok(
    !read('src/ui/hubs/HubScreen.tsx').includes(`'${SAMPLE_DATA_LINE}'`),
    'HubScreen re-declares the sentence instead of importing it',
  );
  assert.ok(
    !/below this is sample data/i.test(read('src/ui/hubs/StoredEntries.tsx')),
    'StoredEntries still claims what is beneath it — that is the bug this replaced',
  );
});

/**
 * And the guard has to be able to fire, or it is an empty baseline wearing a gate's clothes —
 * which `AGENTS.md` asks to be proven rather than assumed.
 */
test('the sample-data guard fires on a real claim and not on a comment about one', () => {
  const claim = /below this is sample data/i;

  assert.ok(!claim.test(stripComments('/* everything below this is sample data */ const a = 1;')));
  assert.ok(!claim.test(stripComments('// everything below this is sample data')));
  assert.ok(claim.test(stripComments('const note = "everything below this is sample data";')));

  // The `[^:]` is what stops `https://` being read as a line comment.
  assert.match(stripComments('const u = "https://ol1.example";'), /https:\/\/ol1\.example/);
});

/**
 * **A count is a claim, and being sample data does not license an impossible one.**
 *
 * The Labs fixture said `34 markers` and `34 of 34 verified`. A panel screen has never accepted
 * more than seventeen, so the sample cockpit described an app that cannot exist.
 *
 * Those rows have since been replaced by a real cockpit — `src/ui/labs/cockpit.ts`, guarded in
 * `tests/labs-cockpit.test.ts`, which cannot invent a count because it reads one. What is left here
 * is the facet copy, which is still written by hand and still able to overclaim.
 *
 * The ceiling is READ from the two marker lists rather than written down, so adding an eighteenth
 * marker raises it on its own and this test never has to be remembered.
 */
test('no fixture claims more markers than a panel can hold', () => {
  const ceiling = LEVINE_MARKERS.length + EXTRA_MARKERS.length;

  const claims = [...JSON.stringify(HUB_STATES).matchAll(/(\d+)\s+markers?\b/g)];
  assert.ok(claims.length > 0, 'nothing counts markers any more, so this stopped guarding anything');

  for (const [, digits] of claims) {
    assert.ok(
      Number(digits) <= ceiling,
      `a fixture claims ${digits} markers and only ${ceiling} exist`,
    );
  }
});

/**
 * **A fixture is still text on a screen, and there is one way this app writes a duration.**
 *
 * The Sleep cockpit read `7h 05m` and `8h 04m`. `formatDuration` — the only function allowed to
 * turn minutes into that shape, guarded by `check-duration-formatters.mjs` — writes `7h 5m`. Two of
 * the four durations on that screen agreed with it and two did not, which is the "agreeing only by
 * luck" that `metric.ts` was ported to end.
 *
 * The script cannot catch this: it looks for the ARITHMETIC, and a fixture does the arithmetic in
 * somebody's head.
 *
 * **Proven on a known violation before it is believed.** No fixture writes a duration today — the
 * Sleep cockpit is real now and formats through the function — and a check with nothing to check
 * looks exactly like a check that passes. So it is shown going red first.
 */
test('a duration in a fixture is written the way this app writes durations', () => {
  const wrong = (text: string) =>
    [...text.matchAll(/(\d+)h (\d+)m/g)].filter(
      ([written, hours, minutes]) =>
        written !== formatDuration(Number(hours) * 60 + Number(minutes)),
    );

  assert.equal(wrong('7h 05m').length, 1, 'the guard does not see a padded minute');
  assert.equal(wrong('slept 8h 04m, woke 6h 51m').length, 1, 'nor one of two in a sentence');
  assert.equal(wrong('7h 5m and 6h 51m').length, 0, 'and it does not fire on correct ones');

  assert.deepEqual(
    wrong(JSON.stringify(HUB_STATES)).map(([written]) => written),
    [],
    'a fixture writes a duration this app would never print',
  );
});

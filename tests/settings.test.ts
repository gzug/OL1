import assert from 'node:assert/strict';
import test from 'node:test';

import { SEED_HUBS, orbitHubs } from '../src/ui/hubs/catalog';
import { GOALS, SPORTS } from '../src/ui/onboarding/firstRun';
import {
  COPY,
  FAILED,
  UNKNOWN,
  goalPayload,
  goalsFrom,
  hubRows,
  ready,
  sportPayload,
  sportsFrom,
  tally,
  tallyLine,
  type EntriesByHub,
} from '../src/ui/settings/settings';

/**
 * A clock that ticks once per call, so a sequence of writes has an order without any test having to
 * invent timestamps. The store sorts by `recordedAt` and so does `goalsFrom`; a fixture where two
 * rows share a millisecond would be testing the tie-break rather than the rule.
 */
function clock(start = Date.parse('2026-08-01T09:00:00.000Z')) {
  let tick = 0;
  return () => new Date(start + (tick += 60_000)).toISOString();
}

const at = clock();

function entry(
  hubId: string,
  kind: string,
  payload: Readonly<Record<string, unknown>>,
  recordedAt = at(),
) {
  return { hubId, id: `${hubId}-${kind}-${recordedAt}`, kind, payload, recordedAt, source: 'manual' };
}

/** What one tap writes, as the screen writes it: a row in the hub the goal belongs to. */
function tapGoal(hubId: string, label: string, held: boolean) {
  return entry(hubId, 'goal', goalPayload(label, held));
}

/* ── Goals converge ────────────────────────────────────────────────────────────────────────── */

/**
 * THE TRAP THIS SCREEN WAS WARNED ABOUT. `hubs.create` is idempotent; writing a goal entry is not.
 * Three taps leave three rows in the store and must leave ONE answer on the screen — otherwise
 * changing an answer accumulates rather than converging, and the second visit to Settings shows a
 * person a list they did not write.
 */
test('a goal turned on, off and on again is held, from three rows', () => {
  const entries: EntriesByHub = {
    sleep: [
      tapGoal('sleep', 'Sleep better', true),
      tapGoal('sleep', 'Sleep better', false),
      tapGoal('sleep', 'Sleep better', true),
    ],
  };

  const held = goalsFrom(entries).filter((goal) => goal.held);
  assert.deepEqual(held.map((goal) => goal.label), ['Sleep better']);
  assert.equal(entries.sleep?.length, 3, 'the store keeps every row — nothing here deletes');
});

test('a goal turned off is not held, and turning it off never removes the hub it lives in', () => {
  const entries: EntriesByHub = {
    labs: [tapGoal('labs', 'Live longer', true), tapGoal('labs', 'Live longer', false)],
  };

  assert.equal(goalsFrom(entries).find((goal) => goal.label === 'Live longer')?.held, false);

  // The written row says one thing and one thing only. A payload that could also carry a hub id or
  // a hidden flag is a payload that could put a hub away by implication, which is the second trap.
  assert.deepEqual(Object.keys(goalPayload('Live longer', false)).sort(), ['held', 'label']);
  assert.deepEqual(Object.keys(goalPayload('Live longer', true)), ['label']);

  const rows = hubRows(SEED_HUBS, []);
  assert.ok(
    rows.every((row) => !row.away),
    'dropping a goal marked a hub as put away',
  );
});

/**
 * Every goal the first run has ever written omits `held`. Reading that absence as "dropped" would
 * empty this screen for the one person who has actually used the app.
 */
test('a goal written before this screen existed still reads as held', () => {
  const entries: EntriesByHub = { sleep: [entry('sleep', 'goal', { label: 'Sleep better' })] };
  assert.equal(goalsFrom(entries).find((goal) => goal.label === 'Sleep better')?.held, true);
});

/**
 * The owner's own question, 2026-08-21: *what if I write a goal and then it is not picked up here?*
 * A typed goal made its own hub and wrote a goal entry inside it, so it has to come back out beside
 * the seven that ship — read from the store, not from a list in the source.
 */
test('a goal somebody typed appears beside the seven that ship', () => {
  const mine = 'Learning to sleep without a phone';
  const goals = goalsFrom({ 'learning-to-sleep-without-a-phone': [tapGoal('learning-to-sleep-without-a-phone', mine, true)] });

  const own = goals.filter((goal) => goal.own);
  assert.deepEqual(own.map((goal) => goal.label), [mine]);
  assert.equal(own[0]?.hubId, 'learning-to-sleep-without-a-phone', 'it must write back to its own hub');
  assert.equal(goals.length, GOALS.length + 1);
});

test('an empty store holds no goals, and says so about nothing else', () => {
  const goals = goalsFrom({});
  assert.equal(goals.length, GOALS.length);
  assert.ok(goals.every((goal) => !goal.held));
  assert.ok(goals.every((goal) => !goal.own));
});

/**
 * A goal pointing at a hub id nothing ships would write into a hub nobody can open — invisible, and
 * impossible to notice on a rendered screen. Asserted against the catalog itself, exactly as
 * `tests/first-run.test.ts` does, so retiring a hub fails here rather than silently.
 */
test('every shipped goal writes into a hub that exists', () => {
  const known = new Set(SEED_HUBS.map((hub) => hub.id));

  for (const goal of goalsFrom({}).filter((entry) => !entry.own)) {
    assert.ok(known.has(goal.hubId), `"${goal.label}" points at "${goal.hubId}", which is not a hub`);
  }
});

/* ── Training ──────────────────────────────────────────────────────────────────────────────── */

test('a sport is named or it is not, and naming it twice still reads as once', () => {
  const named = [
    entry('exercise', 'sport', { coachId: 'running', label: 'Running' }),
    entry('exercise', 'sport', { coachId: 'running', label: 'Running' }),
  ];

  const sports = sportsFrom(named);
  assert.equal(sports.filter((sport) => sport.coachId === 'running').length, 1);
  assert.equal(sports.find((sport) => sport.coachId === 'running')?.named, true);
  assert.equal(sports.find((sport) => sport.coachId === 'golf')?.named, false);
  assert.equal(sports.length, SPORTS.length, 'the five that ship, and nothing invented');
});

test('a sport coach that does not ship still shows as named', () => {
  const sports = sportsFrom([entry('exercise', 'sport', { coachId: 'padel', label: 'Padel' })]);
  assert.equal(sports.find((sport) => sport.label === 'Padel')?.named, true);
  assert.equal(sports.length, SPORTS.length + 1);
});

/**
 * A named sport is a row on Exercise carrying a coach id — `docs/decisions/0014`. The payload has to
 * match what the first run writes, or `sportCoachesFor` reads one of them and not the other.
 */
test('naming a sport writes the coach id the first run writes', () => {
  const running = sportsFrom([]).find((sport) => sport.coachId === 'running');
  assert.ok(running !== undefined);
  assert.deepEqual(sportPayload(running), { coachId: 'running', label: 'Running' });
  assert.deepEqual(
    SPORTS.map((sport) => sport.coachId).sort(),
    sportsFrom([]).filter((sport) => !sport.named).map((sport) => sport.coachId).sort(),
  );
});

/* ── Hubs ──────────────────────────────────────────────────────────────────────────────────── */

test('the hub list is ring order, with anything nested under its parent', () => {
  const rows = hubRows(SEED_HUBS, []);

  assert.deepEqual(
    rows.filter((row) => row.depth === 0).map((row) => row.hub.id),
    orbitHubs(SEED_HUBS).map((hub) => hub.id),
    'the ring order moved',
  );

  const labs = rows.findIndex((row) => row.hub.id === 'labs');
  const medical = rows.findIndex((row) => row.hub.id === 'medical');
  assert.ok(medical >= 0 && labs === medical + 1, 'Labs must sit directly under Health record');
  assert.equal(rows[labs]?.depth, 1);

  assert.ok(!rows.some((row) => row.hub.id === 'new'), 'the + is not a hub and has no row');
  assert.equal(rows.length, SEED_HUBS.length, 'every hub gets exactly one row');
});

test('a hub put away keeps its row, because that row is the way back', () => {
  const rows = hubRows(SEED_HUBS, ['sleep']);
  const sleep = rows.find((row) => row.hub.id === 'sleep');

  assert.equal(sleep?.away, true);
  assert.equal(rows.length, SEED_HUBS.length, 'putting a hub away removed it from the list');
});

/* ── What is stored ────────────────────────────────────────────────────────────────────────── */

test('the count is every entry in every hub, in the words the rest of the app uses', () => {
  const counts = tally({
    exercise: [entry('exercise', 'session', {}), entry('exercise', 'sport', { coachId: 'golf' })],
    nutrition: [
      entry('nutrition', 'weight', { kg: 76 }),
      entry('nutrition', 'meal', {}),
      entry('nutrition', 'meal', {}),
    ],
  });

  assert.equal(
    counts.reduce((total, item) => total + item.count, 0),
    5,
    'an entry went uncounted — a display limit must never reach the arithmetic',
  );

  const line = tallyLine(counts);
  assert.match(line, /2 meals/);
  assert.match(line, /1 weigh-in/, 'a weight is a weigh-in on every other screen too');
  assert.match(line, /1 sport named/);
});

test('nothing stored is nothing counted, and the line is empty rather than invented', () => {
  assert.deepEqual(tally({ sleep: [] }), []);
  assert.equal(tallyLine([]), '');
});

/* ── Honesty ───────────────────────────────────────────────────────────────────────────────── */

/**
 * Shape 1 of `docs/decisions/0013`: a store that will not open must never produce a claim about a
 * person's data. Two states cannot express that — "you have nothing" has to be distinct from both
 * "nobody has looked" and "the lookup failed", and the sentence shown for the third has to be about
 * the app rather than about the person.
 */
test('there are three states, and the failure sentence is about the app and not about you', () => {
  assert.equal(UNKNOWN.status, 'unknown');
  assert.equal(FAILED.status, 'failed');
  assert.equal(ready([]).status, 'ready');
  assert.notEqual(
    UNKNOWN.status,
    FAILED.status,
    'collapsing these prints "could not read" during the first read, or nothing at all when it fails',
  );

  assert.match(COPY.unread, /could not read/i);
  assert.doesNotMatch(COPY.unread, /\byou have no\b|\bnothing (logged|recorded|added)\b/i);
});

/**
 * A person who set a goal and dropped it has two goal rows and one goal. The number above this
 * sentence counts rows, so the sentence has to say that is what it counts. Left unsaid, the count
 * is a tidier claim than the store can support — `0013` in one line.
 */
test('the stored count says what it is a count of', () => {
  assert.match(COPY.storedNote, /written down/i);
  assert.match(COPY.storedNote, /you later changed/i);
  assert.match(COPY.storedNote, /never deleted/i);
});

/** The one thing this screen cannot do yet says so, rather than offering a switch that lies. */
test('the training section admits what it cannot do', () => {
  assert.match(COPY.trainingHint, /not built yet/i);
});

/** OL1's profile has no name field, so no sentence here may address anybody by one. */
test('no copy on this screen greets the user by a name', () => {
  for (const [key, line] of Object.entries(COPY)) {
    assert.doesNotMatch(
      line,
      /\b(hi|hello|hey|good (morning|afternoon|evening|night))\b/i,
      `COPY.${key} greets somebody this app cannot name`,
    );
  }
});

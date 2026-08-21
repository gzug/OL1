import assert from 'node:assert/strict';
import test from 'node:test';

import { SEED_HUBS, orbitHubs } from '../src/ui/hubs/catalog';
import { GOALS, SPORTS } from '../src/ui/onboarding/firstRun';
import {
  COPY,
  ROWS,
  groups,
  rowsIn,
  subtitles,
  type IndexFacts,
  type RowId,
} from '../src/ui/settings/rows';
import {
  FAILED,
  UNKNOWN,
  goalPayload,
  goalsFrom,
  goalsHeld,
  hubRows,
  ready,
  shownSex,
  sportPayload,
  sportsFrom,
  type EntriesByHub,
} from '../src/ui/settings/settings';

/** A clock that ticks once per call, so a sequence of writes has an order without inventing one. */
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

function tapGoal(hubId: string, label: string, held: boolean) {
  return entry(hubId, 'goal', goalPayload(label, held));
}

const FACTS: IndexFacts = {
  coachesTold: 2,
  coachesTotal: 6,
  goals: ['Sleep better', 'Get fitter'],
  hubsAway: 1,
  hubsOnRing: 6,
  profile: { age: 44, heightCm: 178, sex: 'male' },
  sports: ['Running', 'Gym'],
};

/* ── The index ─────────────────────────────────────────────────────────────────────────────── */

/**
 * THE RULE THIS SCREEN IS BUILT ON. `docs/decisions/0013`, shape 1: a line reading *6 on your ring ·
 * 1 put away* drawn from a read that never happened is a claim about somebody's data invented by a
 * database error. Before the store answers, the rows have names and nothing else.
 */
test('nothing is said about a person until the store has answered', () => {
  const quiet = subtitles(null);

  for (const id of ['profile', 'goals', 'hubs', 'coaches'] as const) {
    assert.equal(quiet[id], null, `"${id}" spoke for somebody before anything was read`);
  }
});

/**
 * The other half, and it is why `subtitles(null)` does not simply return all nulls: a line about the
 * app is true whether or not a read happened. Hiding those too would leave four rows unexplained for
 * no reason.
 */
test('a row waiting on something still explains itself when nothing has been read', () => {
  const quiet = subtitles(null);

  assert.equal(quiet.subscription, COPY.subscriptionUnder);
  assert.equal(quiet.notifications, COPY.notificationsUnder);
  assert.equal(quiet.contact, COPY.contactUnder);
  assert.equal(quiet.about, COPY.aboutUnder);
});

test('with an answer, each row says what it holds', () => {
  const said = subtitles(FACTS);

  assert.equal(said.profile, '44 · 178 cm · male figure');
  assert.equal(said.goals, 'Sleep better · Get fitter');
  assert.equal(said.hubs, '6 on your ring · 1 put away');
  assert.equal(said.coaches, '2 of 6 told how to work with you');
});

/** A skipped answer contributes nothing rather than a placeholder saying it was skipped. */
test('a profile says only what was actually given', () => {
  const partial = subtitles({ ...FACTS, profile: { age: null, heightCm: 178, sex: 'male' } });
  assert.equal(partial.profile, '178 cm · male figure');

  const nothing = subtitles({
    ...FACTS,
    profile: { age: null, heightCm: null, sex: 'preferNotToSay' },
  });
  assert.equal(nothing.profile, COPY.profileEmpty, 'a profile with nothing in it claimed a figure');

  const never = subtitles({ ...FACTS, profile: null });
  assert.equal(never.profile, COPY.profileEmpty);
});

test('nothing held reads as nothing, not as zero', () => {
  const empty = subtitles({ ...FACTS, coachesTold: 0, goals: [], hubsAway: 0 });

  assert.equal(empty.goals, COPY.goalsEmpty);
  assert.equal(empty.coaches, COPY.coachesEmpty);
  assert.equal(empty.hubs, '6 on your ring', 'zero put away should not be worth a sentence');
});

test('the groups are the owner’s three, derived from the rows rather than listed twice', () => {
  assert.deepEqual(groups(), ['My One L1fe', 'Account', 'General']);
  assert.deepEqual(
    rowsIn('My One L1fe').map((row) => row.id),
    ['profile', 'goals', 'hubs', 'coaches'],
  );
  assert.deepEqual(
    rowsIn('Account').map((row) => row.id),
    ['contact', 'subscription'],
  );
});

test('every row has a subtitle key and no two rows share an id', () => {
  const ids = ROWS.map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length, 'two rows share an id, so one would win the lookup');

  const said = subtitles(FACTS);
  for (const id of ids) {
    assert.ok(id in said, `"${id}" has no line under it, not even an empty one`);
  }
});

/** Memory was a row and the owner removed it: people relate to the thing, not the abstraction. */
test('there is no Memory row', () => {
  assert.ok(!ROWS.some((row) => (row.id as string) === 'memory'));
  assert.ok(ROWS.some((row) => row.id === 'coaches'), 'coaches is where memory went');
});

/** Every waiting row must open something, so none of them may be silently dropped from the list. */
test('the rows waiting on something are the four we know about', () => {
  const waiting: RowId[] = ROWS.filter((row) => row.state === 'waiting').map((row) => row.id);
  assert.deepEqual(waiting.sort(), ['contact', 'feedback', 'notifications', 'subscription']);
});

/* ── About you ─────────────────────────────────────────────────────────────────────────────── */

/**
 * A DEFAULT IS NOT AN ANSWER, and this one shipped once. With no profile the sex pills rendered
 * "Rather not say" as chosen — a choice shown as already made on behalf of somebody who had not made
 * one. Nothing in CI could see it; one look at the deployed page could.
 */
test('no pill is chosen until somebody has answered', () => {
  assert.equal(shownSex(null), null);
  assert.equal(
    shownSex({ birthYear: null, heightCm: null, sex: 'preferNotToSay', updatedAt: 'x' }),
    'preferNotToSay',
    'skipping is an answer, and a stored one stays chosen',
  );
});

/* ── Goals ─────────────────────────────────────────────────────────────────────────────────── */

test('a goal turned on, off and on again is held', () => {
  const entries: EntriesByHub = {
    sleep: [
      tapGoal('sleep', 'Sleep better', true),
      tapGoal('sleep', 'Sleep better', false),
      tapGoal('sleep', 'Sleep better', true),
    ],
  };

  assert.deepEqual(goalsHeld(entries).map((goal) => goal.label), ['Sleep better']);
});

test('a goal turned off is not one you have, and removing it never touches a hub', () => {
  const entries: EntriesByHub = {
    labs: [tapGoal('labs', 'Live longer', true), tapGoal('labs', 'Live longer', false)],
  };

  assert.deepEqual(goalsHeld(entries), []);

  // The row says one thing and one thing only. A payload that could also carry a hub id or a hidden
  // flag is a payload that could put a hub away by implication.
  assert.deepEqual(Object.keys(goalPayload('Live longer', false)).sort(), ['held', 'label']);
  assert.deepEqual(Object.keys(goalPayload('Live longer', true)), ['label']);
  assert.ok(hubRows(SEED_HUBS, []).every((row) => !row.away));
});

/** Every goal the first run has ever written omits `held`. Reading that as "dropped" empties this. */
test('a goal written before this screen existed still reads as held', () => {
  const entries: EntriesByHub = { sleep: [entry('sleep', 'goal', { label: 'Sleep better' })] };
  assert.equal(goalsHeld(entries).length, 1);
});

test('a goal somebody typed appears beside the seven that ship', () => {
  const mine = 'Learning to cook properly';
  const goals = goalsFrom({ 'learning-to-cook-properly': [tapGoal('learning-to-cook-properly', mine, true)] });

  assert.deepEqual(goals.filter((goal) => goal.own).map((goal) => goal.label), [mine]);
  assert.equal(goals.length, GOALS.length + 1);
});

test('every shipped goal writes into a hub that exists', () => {
  const known = new Set(SEED_HUBS.map((hub) => hub.id));
  for (const goal of goalsFrom({}).filter((entry) => !entry.own)) {
    assert.ok(known.has(goal.hubId), `"${goal.label}" points at "${goal.hubId}", not a hub`);
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
  assert.equal(sports.find((sport) => sport.coachId === 'golf')?.named, false);
  assert.equal(sports.length, SPORTS.length);
});

test('naming a sport writes the coach id the first run writes', () => {
  const running = sportsFrom([]).find((sport) => sport.coachId === 'running');
  assert.ok(running !== undefined);
  assert.deepEqual(sportPayload(running), { coachId: 'running', label: 'Running' });
});

/* ── Hubs ──────────────────────────────────────────────────────────────────────────────────── */

test('the hub list is ring order, with anything nested under its parent', () => {
  const rows = hubRows(SEED_HUBS, []);

  assert.deepEqual(
    rows.filter((row) => row.depth === 0).map((row) => row.hub.id),
    orbitHubs(SEED_HUBS).map((hub) => hub.id),
  );

  const labs = rows.findIndex((row) => row.hub.id === 'labs');
  const medical = rows.findIndex((row) => row.hub.id === 'medical');
  assert.ok(medical >= 0 && labs === medical + 1, 'Labs must sit directly under Health record');
  assert.equal(rows.length, SEED_HUBS.length);
});

test('a hub put away keeps its row, because that row is the way back', () => {
  const rows = hubRows(SEED_HUBS, ['sleep']);
  assert.equal(rows.find((row) => row.hub.id === 'sleep')?.away, true);
  assert.equal(rows.length, SEED_HUBS.length);
});

/* ── Honesty ───────────────────────────────────────────────────────────────────────────────── */

test('there are three states, and the failure sentence is about the app, not about you', () => {
  assert.equal(UNKNOWN.status, 'unknown');
  assert.equal(FAILED.status, 'failed');
  assert.equal(ready([]).status, 'ready');
  assert.notEqual(UNKNOWN.status, FAILED.status);

  assert.match(COPY.unread, /could not read/i);
  assert.doesNotMatch(COPY.unread, /\byou have no\b|\bnothing (logged|recorded|added)\b/i);
});

/**
 * A waiting screen must say what is missing in terms of the thing itself. A date is a promise nobody
 * has made, and "soon" is the same promise with the number removed.
 */
test('nothing waiting promises a date', () => {
  for (const line of [COPY.contactWaiting, COPY.subscriptionWaiting, COPY.notificationsWaiting, COPY.feedbackWaiting]) {
    assert.doesNotMatch(line, /\bsoon\b|\bshortly\b|\bcoming (in|within)\b|\bnext (week|month)\b/i);
  }
  assert.match(COPY.subscriptionWaiting, /nothing behind a paywall/i);
  assert.match(COPY.notificationsWaiting, /sends nothing/i);
});

/** One L1fe has no name field, so no sentence here may address anybody by one. */
test('no copy greets the user by a name', () => {
  for (const [key, line] of Object.entries(COPY)) {
    assert.doesNotMatch(
      line,
      /\b(hi|hello|hey|good (morning|afternoon|evening|night))\b/i,
      `COPY.${key} greets somebody this app cannot name`,
    );
  }
});

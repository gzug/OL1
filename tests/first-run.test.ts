import assert from 'node:assert/strict';
import test from 'node:test';

import { SEED_HUBS, findCoach, findHub } from '../src/ui/hubs/catalog';
import {
  COPY,
  GOALS,
  RECORD_KINDS,
  SKIPPED,
  SPORTS,
  STEPS,
  needsFirstRun,
  nextStep,
  previousStep,
  stillMissing,
} from '../src/ui/onboarding/firstRun';

const PROFILE = {
  birthYear: 1982,
  heightCm: 178,
  sex: 'male',
  updatedAt: '2026-08-20T00:00:00.000Z',
} as const;

test('the flow is shown to somebody who has never answered anything, and to nobody else', () => {
  assert.equal(needsFirstRun(null), true);
  assert.equal(needsFirstRun(PROFILE), false);
  assert.equal(
    needsFirstRun({ birthYear: null, heightCm: null, sex: 'preferNotToSay', updatedAt: 'x' }),
    false,
    'a profile written by a skip is still a profile — the welcome must not come back',
  );
});

test('the steps walk forwards and backwards and stop at both ends', () => {
  assert.equal(previousStep('welcome'), null);
  assert.equal(nextStep('ring'), null);

  const walked = ['welcome'];
  let step = nextStep('welcome');
  while (step !== null) {
    walked.push(step);
    step = nextStep(step);
  }
  assert.deepEqual(walked, [...STEPS], 'nextStep must reach every step exactly once');
});

/**
 * Skipping is an answer, not an absence. Legacy wrote `birthYear: CURRENT_YEAR` here — a sentinel
 * that reads as a real year, passes its own validity check, and makes the age come out 0 so PhenoAge
 * never computes. That is the single most expensive line in the whole first-run audit, and it is
 * still on Legacy's `main`.
 */
test('a skipped answer is null and never a sentinel year', () => {
  assert.equal(SKIPPED.birthYear, null);
  assert.equal(SKIPPED.sex, 'preferNotToSay');
  assert.notEqual(SKIPPED.birthYear as unknown, new Date().getFullYear());
});

/**
 * A goal that points at a hub id nothing ships would write an entry into a hub nobody can open —
 * invisible, and impossible to notice on a rendered screen. Asserted against the catalog itself
 * rather than a list beside it, so retiring a hub fails here instead of silently.
 */
test('every goal lands in a hub that actually exists', () => {
  const known = new Set(SEED_HUBS.map((hub) => hub.id));

  for (const goal of GOALS) {
    assert.ok(goal.hubId !== undefined, `${goal.id} has no hub`);
    assert.ok(known.has(goal.hubId as string), `${goal.id} points at "${goal.hubId}", which is not a hub`);
  }
  assert.ok(GOALS.length > 0, 'this guard has stopped checking anything');
});

/**
 * **A sport names a COACH now, not a hub — `docs/decisions/0014`.**
 *
 * This used to assert every offered sport pointed at a hub inside Exercise. Those hubs were empty
 * rooms and are gone; what a sport earns you is its voice, so that is what has to exist.
 */
test('every offered sport names a coach that really exists', () => {
  for (const sport of SPORTS) {
    assert.ok(
      findCoach(sport.coachId) !== undefined,
      `${sport.id} names the coach "${sport.coachId}", which is not in the catalog`,
    );
    assert.equal(findHub(sport.id), undefined, `${sport.id} is shipping as a hub again`);
  }
  assert.ok(SPORTS.length > 0, 'this guard has stopped checking anything');
});

/**
 * The blood panel is the only one of the three with a path that works: nine named markers with
 * known units feeding a published formula. Offering a file upload for the other two would be a
 * button that accepts something nothing can read — Legacy audit finding #2, rebuilt on purpose.
 */
test('exactly one kind of record can actually be read today', () => {
  const readable = RECORD_KINDS.filter((kind) => kind.readable);
  assert.deepEqual(
    readable.map((kind) => kind.id),
    ['panel'],
  );
  for (const kind of RECORD_KINDS.filter((entry) => !entry.readable)) {
    assert.match(kind.note, /cannot read/i, `${kind.id} does not say that it cannot be read`);
  }
});

test('what is missing names a subject and a cause, and nothing when nothing is', () => {
  const none = stillMissing({ birthYear: 1982, heldUnreadable: [], panelComing: true });
  assert.deepEqual(none, [], 'a gap was invented to fill the space');

  const both = stillMissing({ birthYear: null, heldUnreadable: [], panelComing: false });
  assert.equal(both.length, 1);
  assert.equal(both[0]?.subject, 'Biological age');
  assert.match(both[0]?.cause ?? '', /year of birth/i);
  assert.match(both[0]?.cause ?? '', /blood panel/i);

  const yearOnly = stillMissing({ birthYear: null, heldUnreadable: [], panelComing: true });
  assert.match(yearOnly[0]?.cause ?? '', /year of birth/i);

  const panelOnly = stillMissing({ birthYear: 1982, heldUnreadable: [], panelComing: false });
  assert.match(panelOnly[0]?.cause ?? '', /blood panel/i);

  const held = stillMissing({ birthYear: 1982, heldUnreadable: ['microbiome'], panelComing: true });
  assert.equal(held.length, 1);
  assert.equal(held[0]?.subject, 'Microbiome test');

  for (const gap of [...both, ...held]) {
    assert.ok(gap.subject.length > 0 && gap.cause.length > 0);
  }
});

/**
 * THE LINE LEGACY GOT WRONG. Its Profile screen said "All data stays on your device and remains
 * local" while its own alert, its onboarding and its cloud calls all said otherwise — finding #3.
 *
 * On the web preview this is `localStorage`. It is a browser store that goes when the browser's
 * data is cleared, and it is not durable storage for health data. The copy has to say that and must
 * not borrow the phone's sentence, so this asserts both halves.
 */
test('the web preview does not claim to be a device, or to be durable', () => {
  assert.match(COPY.storageWeb, /browser/i, 'the web line must name where it actually is');
  assert.match(COPY.storageWeb, /not durable/i);
  assert.doesNotMatch(COPY.storageWeb, /on (this|your) (device|phone)/i);
  assert.doesNotMatch(COPY.storageWeb, /stays local|remains local/i);

  // The phone's line is allowed to say device, because there it is true.
  assert.match(COPY.storageNative, /phone/i);
});

/**
 * Legacy's first word to its user was "good NIGHT, G." — an initial invented from a name nobody
 * gave. OL1's profile has no name field, so no sentence here may address anybody by one.
 */
test('no copy in the flow greets the user by a name', () => {
  for (const [key, line] of Object.entries(COPY)) {
    assert.doesNotMatch(
      line,
      /\b(hi|hello|hey|good (morning|afternoon|evening|night))\b/i,
      `COPY.${key} greets somebody this app cannot name`,
    );
  }
});

/**
 * A store that throws mid-flow loses an answer. The flow moves on anyway, because stranding
 * somebody on a card whose button no longer works is the worse failure — but it has to SAY so, and
 * point at the one screen where the important answer can be given again. A summary of answers that
 * were never written is the same species of lie as a hardcoded biological age.
 */
test('a failed write says so, and says where to fix it', () => {
  assert.match(COPY.writeFailed, /did not save/i);
  assert.match(COPY.writeFailed, /About you/);
});

/**
 * The copy has to count what is actually on the screen.
 *
 * "Three things, and you can skip any of them" sat above four fields — year, height, weight, sex —
 * and had been wrong since the flow's first commit. Small, and exactly the shape of everything else
 * the sweep found: a sentence that described the screen when it was written.
 */
test('the about screen says how many things it asks for, and is right', () => {
  const asked = ['yearLabel', 'heightLabel', 'weightLabel', 'sexLabel'] as const;
  const words = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

  for (const key of asked) {
    assert.ok(typeof COPY[key] === 'string' && COPY[key].length > 0, `${key} is not a real field`);
  }
  assert.ok(
    COPY.aboutHint.startsWith(`${words[asked.length - 1]} things`),
    `the hint counts wrong: "${COPY.aboutHint.slice(0, 40)}…" above ${asked.length} fields`,
  );
});

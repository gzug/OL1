import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  INVITE,
  NOTHING_GIVEN,
  NOT_READ,
  aboutYouFrom,
  summaryLine,
} from '../src/ui/twin/aboutYou';
import { twinSources } from '../src/ui/twin/sources';

const TWIN = new URL('../src/ui/mockup/TwinMockup.tsx', import.meta.url).pathname;
const FIXTURES = new URL('../src/ui/mockup/fixtures.ts', import.meta.url).pathname;

/* ── Nothing invented is left ──────────────────────────────────────────────────────────────── */

/**
 * The guard that stops this coming back, and the reason the fixtures file was deleted rather than
 * emptied: an empty file invites a re-fill, a missing one has to be re-created on purpose.
 *
 * Every invented block on this screen was added innocently, to see whether a layout held. The
 * problem was never that they existed — it was that they outlived the layout question and started
 * reading as somebody's history. `docs/decisions/0016`.
 */
test('the Twin imports no fixtures, and there are none to import', () => {
  const source = readFileSync(TWIN, 'utf8');

  assert.ok(
    !/from\s+'[^']*fixtures'/.test(source),
    'TwinMockup is importing a fixtures module again',
  );
  assert.ok(!existsSync(FIXTURES), 'src/ui/mockup/fixtures.ts is back');
});

/**
 * With nothing invented left, the marker has nothing to mark — and a line saying everything below is
 * sample data, on a screen where nothing is, is itself a false claim.
 */
test('the Twin draws no sample-data line, because it has nothing to separate', () => {
  const source = readFileSync(TWIN, 'utf8');
  assert.ok(!source.includes('SAMPLE_DATA_LINE'), 'the Twin marks sample data it no longer has');
});

/** Nothing may be connected until something can be. Correct today; see the note in `sources.ts`. */
test('no source claims to be reading anything', () => {
  assert.ok(twinSources.length > 0, 'this guard has stopped checking anything');
  for (const source of twinSources) {
    assert.equal(source.state, 'missing', `${source.label} claims to be reading`);
    assert.doesNotMatch(source.detail, /\bnightly\b|\bfrom your\b|\bsynced\b/i);
  }
});

/* ── About you says nothing before it has looked ───────────────────────────────────────────── */

/**
 * SHAPE 1 OF `0013`, AND THE DEFECT THIS FILE WAS WRITTEN FOR. One `null` covered three things —
 * not read yet, read failed, and no profile — and all three printed the same invitation. So a
 * database error asked somebody for a year they had already given.
 */
test('nothing is said about a person before the store has answered', () => {
  assert.equal(summaryLine(NOT_READ), null, 'it spoke for somebody before anything was read');
  assert.notEqual(NOT_READ.status, NOTHING_GIVEN.status);
});

test('once the store answers and there is no profile, asking is honest', () => {
  assert.equal(summaryLine(NOTHING_GIVEN), INVITE);
  assert.equal(summaryLine(aboutYouFrom(null, new Date('2026-08-22T00:00:00.000Z'))), INVITE);
});

test('the summary says only what was actually given', () => {
  const today = new Date('2026-08-22T00:00:00.000Z');

  const whole = aboutYouFrom(
    { birthYear: 1982, heightCm: 178, sex: 'male', updatedAt: 'x' },
    today,
  );
  assert.equal(summaryLine(whole), '44 years old · 178 cm · Male');

  const yearOnly = aboutYouFrom(
    { birthYear: 1982, heightCm: null, sex: 'preferNotToSay', updatedAt: 'x' },
    today,
  );
  assert.equal(
    summaryLine(yearOnly),
    '44 years old',
    'a sex nobody chose was printed as though it were an answer',
  );

  const skipped = aboutYouFrom(
    { birthYear: null, heightCm: null, sex: 'preferNotToSay', updatedAt: 'x' },
    today,
  );
  assert.equal(summaryLine(skipped), INVITE, 'a profile written by a skip claimed to hold something');
});

/** Derived at read time, never stored — a stored age is wrong from the next birthday onwards. */
test('the age is worked out from the year, and the year is kept for the editor', () => {
  const state = aboutYouFrom(
    { birthYear: 1990, heightCm: null, sex: 'female', updatedAt: 'x' },
    new Date('2026-08-22T00:00:00.000Z'),
  );

  assert.equal(state.status, 'known');
  if (state.status !== 'known') return;
  assert.equal(state.age, 36);
  assert.equal(state.birthYear, 1990, 'the editor has nothing to show back without it');
});

/**
 * A HEADING OVER AN EMPTY SECTION, found on the deployed screen. `Ledger` returns null when nothing
 * has been recorded, but the Twin wrapped it in a titled section with a card behind it — so somebody
 * who had logged nothing got the word LEDGER over an empty white box. It owns its heading now, so
 * the whole block leaves together.
 */
test('the ledger heading belongs to the ledger, so an empty one takes it with it', () => {
  const twin = readFileSync(TWIN, 'utf8');
  const ledger = readFileSync(
    new URL('../src/ui/twin/Ledger.tsx', import.meta.url).pathname,
    'utf8',
  );

  assert.ok(
    !/<Section title="Ledger">/.test(twin),
    'the Twin is titling the ledger again, so an empty one keeps its heading',
  );
  assert.ok(/LEDGER/.test(ledger), 'the ledger no longer carries its own heading');
  assert.ok(
    /if \(state === null \|\| state\.lines\.length === 0\) return null;/.test(ledger),
    'the ledger stopped disappearing when it has nothing to show',
  );
});

/** One L1fe has no name field, so nothing on this screen may address anybody by one. */
test('no copy on the Twin greets the user by a name', () => {
  const source = readFileSync(TWIN, 'utf8');
  assert.doesNotMatch(
    source,
    /\b(hi|hello|hey|good (morning|afternoon|evening|night))\b,/i,
    'the Twin greets somebody this app cannot name',
  );
});

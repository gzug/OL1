import assert from 'node:assert/strict';
import test from 'node:test';

import type { HubEntry } from '../src/core/hubs';
import { medicalPeriods, recordNotes } from '../src/ui/medical/cockpit';
import { NAME_LENGTH, nameProblem, recordEntryId, recordPayload } from '../src/ui/medical/record';

/**
 * The Health record. **Every name below is invented**, and deliberately not a real condition or a
 * real drug — the fixtures rule is firmest about exactly this, and a plausible-looking one invites
 * being read as somebody's.
 */

const record = (
  kind: 'condition' | 'medication',
  name: string,
  status: string,
  detail?: string,
): HubEntry => ({
  hubId: 'medical',
  id: `answer:${kind}:medical:${name.toLowerCase()}`,
  kind,
  payload: { name, status, ...(detail === undefined ? {} : { detail }) },
  recordedAt: '2026-08-01T00:00:00.000Z',
  source: 'manual',
});

test('a name has to be a name, and the rest goes in the note', () => {
  assert.equal(nameProblem(''), 'tooShort');
  assert.equal(nameProblem(' a '), 'tooShort');
  assert.equal(nameProblem('ab'), null, 'two characters is a name somebody chose');
  assert.equal(nameProblem('x'.repeat(NAME_LENGTH.max)), null);
  assert.equal(nameProblem('x'.repeat(NAME_LENGTH.max + 1)), 'tooLong');
});

test('a blank optional field is absent rather than empty', () => {
  assert.deepEqual(recordPayload(' Thing One ', 'current', '  ', ''), {
    name: 'Thing One',
    status: 'current',
  });
  assert.deepEqual(recordPayload('Thing One', 'current', ' 2019 ', ' told in March '), {
    detail: '2019',
    name: 'Thing One',
    note: 'told in March',
    status: 'current',
  });
});

/**
 * **A standing fact, not an event.** Typing the same name again is a correction — somebody adding a
 * date they forgot, or moving it from current to past. An event id would accumulate, and a record
 * reporting one condition three times because it had been edited twice is worse than none.
 */
test('the same name is the same record, however it is capitalised', () => {
  assert.equal(recordEntryId('condition', 'Thing One'), recordEntryId('condition', ' thing one '));
  assert.notEqual(recordEntryId('condition', 'Thing One'), recordEntryId('condition', 'Thing Two'));
  assert.notEqual(
    recordEntryId('condition', 'Thing One'),
    recordEntryId('medication', 'Thing One'),
    'a condition and a medication may honestly share a name',
  );
});

test('nothing recorded draws nothing at all', () => {
  assert.deepEqual(medicalPeriods([]), []);
  assert.deepEqual(medicalPeriods([record('condition', 'Thing One', 'nonsense')]), []);
  assert.deepEqual(medicalPeriods([{ ...record('condition', 'Thing One', 'current'), kind: 'note' }]), []);
});

/**
 * **It lists rather than summarising.** A health record is nothing but its items; "3 conditions
 * recorded" without the names is a summary of something nobody can see.
 */
test('every record is named, with its status and its one detail', () => {
  const [conditions, medications] = medicalPeriods([
    record('condition', 'Thing One', 'current', 'since 2019'),
    record('medication', 'Remedy One', 'ongoing', 'one a day'),
  ]);

  assert.equal(conditions?.label, 'Conditions');
  assert.deepEqual(conditions?.rows[0], {
    label: 'Thing One',
    value: 'Current',
    when: 'since 2019',
  });

  assert.equal(medications?.label, 'Medications');
  assert.deepEqual(medications?.rows[0], {
    label: 'Remedy One',
    value: 'Ongoing',
    when: 'one a day',
  });
});

test('a record with no detail says which detail is missing', () => {
  const [conditions, medications] = medicalPeriods([
    record('condition', 'Thing One', 'current'),
    record('medication', 'Remedy One', 'ongoing'),
  ]);

  assert.equal(conditions?.rows[0]?.when, 'no date given');
  assert.equal(medications?.rows[0]?.when, 'no dose recorded');
});

/**
 * **Current before past, alphabetical inside each — not newest first**, which is what every other
 * block in this app does. A record is read for what is true now, and something recorded years ago
 * is no less current for being old.
 */
test('what is true now comes first', () => {
  const [conditions] = medicalPeriods([
    record('condition', 'Beta', 'past'),
    record('condition', 'Delta', 'current'),
    record('condition', 'Alpha', 'past'),
    record('condition', 'Gamma', 'current'),
  ]);

  assert.deepEqual(
    conditions?.rows.map((row) => `${row.label} ${row.value}`),
    ['Delta Current', 'Gamma Current', 'Alpha Past', 'Beta Past'],
  );
});

/** A hub with only medications shows only medications, not an empty Conditions heading. */
test('an empty half produces no heading', () => {
  const periods = medicalPeriods([record('medication', 'Remedy One', 'ongoing')]);

  assert.equal(periods.length, 1);
  assert.equal(periods[0]?.label, 'Medications');
});

/**
 * **The refusal `0019` exists for.** A person is likelier to assume this than anything else in the
 * app: a health app holding a medication list is exactly the kind of thing that checks.
 */
test('nothing in the block judges, classifies or compares two medications', () => {
  const text = JSON.stringify(
    medicalPeriods([
      record('medication', 'Remedy One', 'ongoing', 'two a day'),
      record('medication', 'Remedy Two', 'ongoing', 'one a day'),
      record('condition', 'Thing One', 'current'),
    ]),
  ).toLowerCase();

  for (const claim of ['interaction', 'severity', 'severe', 'mild', 'risk', 'warning', 'caution', 'avoid', 'contraindic']) {
    assert.ok(!text.includes(claim), `the record claimed "${claim}"`);
  }
});

/* ── The free text, which had no screen at all ──────────────────────────────────────────────── */

const note = (text: string, recordedAt: string): HubEntry => ({
  hubId: 'medical',
  id: `note-${recordedAt}`,
  kind: 'note',
  payload: { text },
  recordedAt,
  source: 'manual',
});

/**
 * **The first run asks "anything you live with" and files the answer here, verbatim** — and until
 * 2026-08-22 nothing rendered it. `medicalPeriods` reads conditions and medications; `StoredEntries`
 * prints a date and a provenance. Somebody who typed a sentence saw "2 notes" and two dates.
 */
test('what somebody wrote comes back out exactly as it went in', () => {
  const said = 'Something invented, worse when travelling.';
  assert.deepEqual(recordNotes([note(`  ${said}  `, '2026-08-01T00:00:00.000Z')]), [
    { day: '1 Aug', text: said },
  ]);
});

/** A note is something written on a day. The conditions above it are standing facts and sort differently. */
test('notes are newest first, and the date they sort on is not the date they show', () => {
  const notes = recordNotes([
    note('Second', '2026-08-02T00:00:00.000Z'),
    note('Thirteenth', '2026-07-13T00:00:00.000Z'),
    note('Twentieth', '2026-08-20T00:00:00.000Z'),
  ]);

  assert.deepEqual(
    notes.map((entry) => entry.text),
    ['Twentieth', 'Second', 'Thirteenth'],
  );
  /* Sorting the FORMATTED day would put "13 Jul" before "2 Aug" and "20 Aug" last. */
  assert.deepEqual(
    notes.map((entry) => entry.day),
    ['20 Aug', '2 Aug', '13 Jul'],
  );
});

test('an empty note is absent rather than a blank line on the record', () => {
  assert.deepEqual(recordNotes([note('   ', '2026-08-01T00:00:00.000Z')]), []);
  assert.deepEqual(recordNotes([record('condition', 'Thing One', 'current')]), []);
});

/**
 * **Notes alone are a record.** `RecordCockpit` used to return null on `medicalPeriods` being empty,
 * so a hub holding nothing but what somebody typed in the first run drew no cockpit whatsoever.
 * The two readers together are what the screen now decides on.
 */
test('a hub holding only notes still has something to show', () => {
  const entries = [note('Something invented.', '2026-08-01T00:00:00.000Z')];

  assert.deepEqual(medicalPeriods(entries), [], 'no condition and no medication');
  assert.equal(recordNotes(entries).length, 1, 'and still something to render');
});

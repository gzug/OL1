import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseCsv,
  parseStartedAt,
  parseStravaCsv,
  sessionPayloadOf,
} from '../src/application/exercise/stravaCsv';

/**
 * Reading a Strava export.
 *
 * Every row here is INVENTED. The column knowledge is not — it comes from
 * `docs/reference/strava-csv-export.md`, verified against a real German export before the file that
 * proved it was purged from Legacy.
 */

/** The German export's real header shape, including both trap columns. */
const HEADER =
  '"Aktivitäts-ID","Aktivitätsdatum","Name der Aktivität","Aktivitätsart","Distanz",' +
  '"Max. Herzfrequenz","Bewegungszeit","Distanz","Durchschnittliche HF","Kalorien"';

const row = (cells: readonly string[]) => cells.map((cell) => `"${cell}"`).join(',');

test('a quoted field keeps its commas, its emoji and its doubled quotes', () => {
  const rows = parseCsv('a,b\n"Lauf am Morgen, langsam 🏃","say ""hi"""');

  assert.deepEqual(rows[1], ['Lauf am Morgen, langsam 🏃', 'say "hi"']);
});

test('the byte-order mark Strava writes does not become part of the first header', () => {
  const rows = parseCsv('﻿Aktivitäts-ID,x\n1,2');

  assert.equal(rows[0]?.[0], 'Aktivitäts-ID');
});

/**
 * **The trap that costs a day.** There are two `Distanz` columns. The early one mixes kilometres
 * and metres with a comma decimal and a thousands-dot on swims; the LAST is unambiguous metres.
 */
test('distance comes from the last Distanz column, never the first', () => {
  const csv = [
    HEADER,
    row(['111', '03.02.2024, 07:39:00', 'Lauf am Morgen', 'Lauf', '1.500', '183', '2940', '6300.0', '160', '512']),
  ].join('\n');

  const { activities } = parseStravaCsv(csv);
  assert.equal(activities[0]?.distanceM, 6300, 'it read the ambiguous early column');
});

/** And the other one: two max-heart-rate columns, the FIRST being the more complete. */
test('max heart rate comes from the first of its two columns', () => {
  const csv = [
    HEADER,
    row(['111', '03.02.2024, 07:39:00', 'x', 'Lauf', '0', '183', '2940', '6300', '160', '']),
  ].join('\n');

  const found = parseStravaCsv(csv).activities[0];
  assert.equal(found?.maxHr, 183);
  assert.equal(found?.avgHr, 160);
  assert.equal(found?.calories, null, 'an empty cell is null, never zero');
});

/**
 * **No timezone is invented.** Legacy appended `Z` to this wall-clock and called it UTC, which held
 * only because its data came from one city with no daylight saving. Doing that generally puts a run
 * at the wrong hour, and sometimes on the wrong day, for anybody who has travelled.
 */
test('the timestamp stays wall-clock, in both export languages', () => {
  assert.deepEqual(parseStartedAt('03.02.2024, 07:39:00'), {
    localDate: '2024-02-03',
    startedAtLocal: '2024-02-03T07:39:00',
  });
  assert.deepEqual(parseStartedAt('Feb 3, 2024, 7:39:00 AM'), {
    localDate: '2024-02-03',
    startedAtLocal: '2024-02-03T07:39:00',
  });
  assert.equal(parseStartedAt('Feb 3, 2024, 7:39:00 PM')?.startedAtLocal, '2024-02-03T19:39:00');
  assert.equal(parseStartedAt('Feb 3, 2024, 12:30:00 AM')?.startedAtLocal, '2024-02-03T00:30:00');
  assert.equal(parseStartedAt('Feb 3, 2024, 12:30:00 PM')?.startedAtLocal, '2024-02-03T12:30:00');

  assert.equal(parseStartedAt('not a date'), null);
  assert.ok(!(parseStartedAt('03.02.2024, 07:39:00')?.startedAtLocal ?? '').includes('Z'));
});

/** A watch and a phone recording the same run make two rows. Same sport, same day, same length. */
test('a session recorded twice is imported once', () => {
  const csv = [
    HEADER,
    row(['111', '03.02.2024, 07:39:00', 'Watch', 'Lauf', '0', '183', '2940', '6300', '160', '']),
    row(['222', '03.02.2024, 07:39:00', 'Phone', 'Lauf', '0', '180', '2940', '6301', '158', '']),
  ].join('\n');

  const { activities, duplicates } = parseStravaCsv(csv);
  assert.equal(activities.length, 1);
  assert.equal(duplicates, 1, 'the second is counted, not silently dropped');
});

test('Strava’s sports become ours, and an unknown one is honestly other', () => {
  const kinds = ['Lauf', 'Radfahren', 'Schwimmen', 'Run', 'Ride', 'Weight Training', 'Bogenschießen'].map(
    (type, index) =>
      parseStravaCsv(
        [HEADER, row([`${index}`, `0${index + 1}.02.2024, 07:00:00`, 'x', type, '0', '', '600', '1000', '', ''])].join('\n'),
      ).activities[0]?.kind,
  );

  assert.deepEqual(kinds, ['running', 'cycling', 'swimming', 'running', 'cycling', 'gym', 'other']);
});

/**
 * A file this cannot read must not be half-read. Columns are found by header, so a Strava change
 * fails loudly and names what is missing rather than shifting every field by one.
 */
test('a file that is not a Strava export says so, and imports nothing', () => {
  const wrong = parseStravaCsv('name,total\nSomething,5');

  assert.equal(wrong.activities.length, 0);
  assert.match(wrong.problem ?? '', /not look like a Strava export/);
  assert.match(wrong.problem ?? '', /date|duration|id|type/);

  assert.match(parseStravaCsv('').problem ?? '', /no rows/);
});

test('a row missing its time or its length is counted as skipped, never guessed at', () => {
  const csv = [
    HEADER,
    row(['111', '', 'no date', 'Lauf', '0', '', '2940', '6300', '', '']),
    row(['222', '04.02.2024, 07:00:00', 'no duration', 'Lauf', '0', '', '', '6300', '', '']),
    row(['333', '05.02.2024, 07:00:00', 'fine', 'Lauf', '0', '', '1800', '5000', '', '']),
  ].join('\n');

  const { activities, skipped } = parseStravaCsv(csv);
  assert.equal(activities.length, 1);
  assert.equal(skipped, 2);
});

test('an imported activity becomes the same shape logging one by hand writes', () => {
  const csv = [
    HEADER,
    row(['111', '03.02.2024, 07:39:00', 'Nachtlauf', 'Lauf', '0', '183', '2940', '6300', '160', '512']),
  ].join('\n');

  const payload = sessionPayloadOf(parseStravaCsv(csv).activities[0] as never) as Record<string, unknown>;

  assert.equal(payload.activity, 'running');
  assert.equal(payload.minutes, 49, '2940 seconds is 49 minutes');
  assert.equal(payload.distanceKm, 6.3);
  assert.equal(payload.note, 'Nachtlauf');
  assert.equal(payload.stravaId, '111');
});

test('activities come back oldest first, whatever order the file had', () => {
  const csv = [
    HEADER,
    row(['2', '05.02.2024, 07:00:00', 'b', 'Lauf', '0', '', '1800', '5000', '', '']),
    row(['1', '03.02.2024, 07:00:00', 'a', 'Lauf', '0', '', '1200', '4000', '', '']),
  ].join('\n');

  assert.deepEqual(
    parseStravaCsv(csv).activities.map((activity) => activity.localDate),
    ['2024-02-03', '2024-02-05'],
  );
});

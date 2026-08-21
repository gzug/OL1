/**
 * Reading a Strava CSV export.
 *
 * **The column knowledge here was verified against a real German export**, not read off
 * documentation — see `docs/reference/strava-csv-export.md`, salvaged from Legacy's
 * `genStravaDemoSeed.py` before that file was purged. Two of Strava's columns are traps, and both
 * cost a day to find the first time.
 *
 * **Columns are found by HEADER, not by index.** Legacy used fixed indices, which is faster to
 * write and fails silently the day Strava adds a column — every field quietly shifts and the import
 * still "succeeds". A header lookup fails loudly, naming what it could not find.
 *
 * Pure: text in, activities out. No file handling, no store. The same parser serves whichever way
 * the text arrives, and it can be asserted in bare Node against real export layouts.
 */

/** What one row becomes. Nothing here is guessed — an absent field stays null. */
export type StravaActivity = {
  /** Average heart rate, or null. Metadata; nothing computes with it yet. */
  readonly avgHr: number | null;
  readonly calories: number | null;
  /** Metres, or null where the sport has no distance. */
  readonly distanceM: number | null;
  readonly durationSec: number;
  /** Strava's own id, so a second import of the same file does not double anything. */
  readonly id: string;
  /** `YYYY-MM-DD`, from the wall-clock string. See the note on time below. */
  readonly localDate: string;
  readonly maxHr: number | null;
  readonly name: string;
  /** The OL1 session type this maps to, or `other` when nothing here recognises it. */
  readonly kind: string;
  /** Strava's own label, kept so a screen can say what it read. */
  readonly rawType: string;
  /** Wall-clock at the place it happened, `YYYY-MM-DDTHH:MM:SS`. **Deliberately no `Z`.** */
  readonly startedAtLocal: string;
};

export type StravaImport = {
  readonly activities: readonly StravaActivity[];
  /** Rows that were duplicates of one already taken — a watch and a phone recording the same run. */
  readonly duplicates: number;
  /** Set when the file could not be read at all. The screen shows this instead of a count. */
  readonly problem: string | null;
  /** Rows that could not be read. Reported, never silently dropped. */
  readonly skipped: number;
};

/**
 * Strava's sport labels, in the two languages an export comes in.
 *
 * The key is lowercased. Anything unrecognised becomes `other`, which the body figure already
 * reports honestly as a session it cannot place rather than guessing at muscles.
 */
const TYPES: Readonly<Record<string, string>> = {
  // German
  lauf: 'running',
  laufen: 'running',
  radfahren: 'cycling',
  schwimmen: 'swimming',
  wandern: 'hiking',
  gehen: 'walking',
  spaziergang: 'walking',
  krafttraining: 'gym',
  training: 'gym',
  golf: 'golf',
  // English
  run: 'running',
  ride: 'cycling',
  swim: 'swimming',
  hike: 'hiking',
  walk: 'walking',
  'weight training': 'gym',
  workout: 'gym',
};

/** Header spellings for each field, in both languages. Order does not matter; presence does. */
const HEADERS = {
  avgHr: ['durchschnittliche hf', 'average heart rate'],
  calories: ['kalorien', 'calories'],
  date: ['aktivitätsdatum', 'aktivitaetsdatum', 'activity date'],
  distance: ['distanz', 'distance'],
  duration: ['bewegungszeit', 'moving time'],
  id: ['aktivitäts-id', 'aktivitaets-id', 'activity id'],
  maxHr: ['max. herzfrequenz', 'max heart rate'],
  name: ['name der aktivität', 'name der aktivitaet', 'activity name'],
  type: ['aktivitätsart', 'aktivitaetsart', 'activity type'],
} as const;

/**
 * A real CSV reader, because a split on commas destroys this file.
 *
 * Activity names are free text containing commas and emoji, the date field is `DD.MM.YYYY, HH:MM:SS`
 * — a comma inside a quoted value — and a name can contain a newline. Handles doubled quotes (`""`)
 * and strips the UTF-8 BOM Strava puts at the front.
 */
export function parseCsv(text: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const source = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Where each field is, by header.
 *
 * **Two headers appear twice and the right one differs**, which is the whole reason this returns
 * indices rather than a name lookup:
 *
 * - `Distanz` — the EARLY one mixes kilometres and metres, uses a comma decimal, and has a
 *   thousands-dot trap on swims where `1.500` is either a metre and a half or fifteen hundred. The
 *   LAST one is unambiguous metres.
 * - `Max. Herzfrequenz` — the FIRST is the more complete of the two.
 */
function columns(header: readonly string[]): Readonly<Record<string, number>> {
  const lower = header.map((cell) => cell.trim().toLowerCase().replace(/^﻿/, ''));
  const at = (names: readonly string[], last: boolean) => {
    const found = lower.flatMap((cell, index) => (names.includes(cell) ? [index] : []));
    return found.length === 0 ? -1 : ((last ? found[found.length - 1] : found[0]) as number);
  };

  return {
    avgHr: at(HEADERS.avgHr, false),
    calories: at(HEADERS.calories, false),
    date: at(HEADERS.date, false),
    distance: at(HEADERS.distance, true),
    duration: at(HEADERS.duration, false),
    id: at(HEADERS.id, false),
    maxHr: at(HEADERS.maxHr, false),
    name: at(HEADERS.name, false),
    type: at(HEADERS.type, false),
  };
}

function num(cell: string | undefined): number | null {
  const text = (cell ?? '').trim();
  if (text.length === 0) return null;
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function whole(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}

/**
 * `DD.MM.YYYY, HH:MM:SS` or `MMM D, YYYY, H:MM:SS AM` → wall-clock, with no timezone attached.
 *
 * **Legacy appended `Z` and called it UTC.** That was correct only because its data came from one
 * city with no daylight saving. It does not generalise, and doing it here would place a run at the
 * wrong hour — sometimes the wrong day — for anyone who has travelled. The date a person sees comes
 * from the string they were shown; nothing here invents an instant.
 */
export function parseStartedAt(cell: string): { localDate: string; startedAtLocal: string } | null {
  const text = cell.trim();

  const german = /^(\d{2})\.(\d{2})\.(\d{4}),?\s+(\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (german !== null) {
    const [, day, month, year, hour, minute, second] = german;
    return {
      localDate: `${year}-${month}-${day}`,
      startedAtLocal: `${year}-${month}-${day}T${hour}:${minute}:${second}`,
    };
  }

  const english =
    /^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i.exec(text);
  if (english !== null) {
    const [, monthName, day, year, hour12, minute, second, meridiem] = english;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = months.indexOf((monthName as string).toLowerCase().slice(0, 3)) + 1;
    if (month === 0) return null;

    let hour = Number(hour12) % 12;
    if ((meridiem as string).toUpperCase() === 'PM') hour += 12;

    const pad = (value: number | string) => String(value).padStart(2, '0');
    const date = `${year}-${pad(month)}-${pad(day as string)}`;
    return { localDate: date, startedAtLocal: `${date}T${pad(hour)}:${minute}:${second}` };
  }

  return null;
}

export function parseStravaCsv(text: string): StravaImport {
  const rows = parseCsv(text);
  const header = rows[0];

  if (header === undefined || rows.length < 2) {
    return { activities: [], duplicates: 0, problem: 'That file has no rows in it.', skipped: 0 };
  }

  const column = columns(header);
  const missing = (['date', 'duration', 'id', 'type'] as const).filter((key) => column[key] === -1);

  if (missing.length > 0) {
    return {
      activities: [],
      duplicates: 0,
      /* Loud rather than silent. A file this cannot read is a file it must not half-read. */
      problem: `That does not look like a Strava export — it has no ${missing.join(', ')} column.`,
      skipped: 0,
    };
  }

  const activities: StravaActivity[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const cell = (key: string) => row[column[key] as number];

    const id = (cell('id') ?? '').trim();
    const when = parseStartedAt(cell('date') ?? '');
    const duration = whole(num(cell('duration')));

    if (id.length === 0 || when === null || duration === null || duration <= 0) {
      // A row missing its identity, its time or its length is not a session. Counted, never guessed.
      if (row.length > 1) skipped += 1;
      continue;
    }

    /**
     * A watch and a phone both recording produce two rows for one session. Legacy's key, and it
     * holds up: the same sport, the same length, on the same day, twice, is one session recorded
     * twice. Strava's own id is not the key — the two recordings have different ids.
     */
    const rawType = (cell('type') ?? '').trim();
    const key = `${when.localDate}|${rawType}|${duration}`;
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);

    const distance = num(cell('distance'));

    activities.push({
      avgHr: whole(num(cell('avgHr'))),
      calories: whole(num(cell('calories'))),
      distanceM: distance !== null && distance > 0 ? Math.round(distance * 10) / 10 : null,
      durationSec: duration,
      id,
      kind: TYPES[rawType.toLowerCase()] ?? 'other',
      localDate: when.localDate,
      maxHr: whole(num(cell('maxHr'))),
      name: (cell('name') ?? '').trim(),
      rawType,
      startedAtLocal: when.startedAtLocal,
    });
  }

  activities.sort((a, b) => a.startedAtLocal.localeCompare(b.startedAtLocal));
  return { activities, duplicates, problem: null, skipped };
}

/** What an activity becomes in the store: the same shape `LogSessionFlow` writes. */
export function sessionPayloadOf(activity: StravaActivity): Readonly<Record<string, unknown>> {
  return {
    activity: activity.kind,
    minutes: Math.round(activity.durationSec / 60),
    ...(activity.distanceM === null ? {} : { distanceKm: Math.round(activity.distanceM) / 1000 }),
    ...(activity.name.length === 0 ? {} : { note: activity.name }),
    /* Kept so a screen can say what Strava called it, and so an unmapped sport is inspectable
       rather than just `other`. */
    stravaId: activity.id,
    stravaType: activity.rawType,
  };
}

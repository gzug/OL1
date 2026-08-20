/**
 * The profile on a device, in the same SQLite file everything else uses.
 *
 * One row, and the schema enforces it — `CHECK (id = 1)`, the trick `bootstrap_probe` uses. This app
 * has one person in it, and a table that could hold two would eventually hold two with nothing to
 * say which was current.
 *
 * Migrations are `storageAdapter.initialize()`'s job, not this file's. `height_cm` arrived in
 * migration 6 and reads as null on a database written before it, which is the same thing as a
 * height nobody has given.
 */

import * as SQLite from 'expo-sqlite';

import type { Profile, ProfileStore, Sex } from '@/core/profile';
import { storageAdapter } from '@/infrastructure/storage/storageAdapter';

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

function database(): Promise<SQLite.SQLiteDatabase> {
  opening ??= (async () => {
    await storageAdapter.initialize();
    return SQLite.openDatabaseAsync('ol1-bootstrap.db');
  })();
  return opening;
}

type Row = {
  birth_year: number | null;
  height_cm: number | null;
  sex: string | null;
  updated_at: string;
};

/** An unrecognised value is treated as unanswered rather than coerced into a sex nobody chose. */
function toSex(value: string | null): Sex {
  return value === 'female' || value === 'male' || value === 'other' ? value : 'preferNotToSay';
}

export const profileStore: ProfileStore = {
  async read() {
    const db = await database();
    const row = await db.getFirstAsync<Row>(
      'SELECT birth_year, height_cm, sex, updated_at FROM profile WHERE id = 1',
    );
    if (row === null || row === undefined) return null;

    return {
      birthYear: row.birth_year,
      heightCm: row.height_cm,
      sex: toSex(row.sex),
      updatedAt: row.updated_at,
    };
  },

  async write(profile) {
    const db = await database();
    await db.runAsync(
      `INSERT INTO profile (id, birth_year, height_cm, sex, updated_at) VALUES (1, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET birth_year = excluded.birth_year,
                                     height_cm = excluded.height_cm,
                                     sex = excluded.sex,
                                     updated_at = excluded.updated_at`,
      profile.birthYear,
      profile.heightCm,
      profile.sex,
      profile.updatedAt,
    );
  },
};

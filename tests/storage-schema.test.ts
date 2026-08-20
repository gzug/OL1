import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CREATE_MIGRATION_TABLE_SQL,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
} from '../src/infrastructure/storage/schema';

test('the schema is versioned and contains no legacy health tables', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 5);
  assert.deepEqual(
    MIGRATIONS.map((migration) => migration.version),
    [1, 2, 3, 4, 5],
  );

  const sql = `${CREATE_MIGRATION_TABLE_SQL}\n${MIGRATIONS.map((item) => item.sql).join('\n')}`;
  assert.match(sql, /schema_migrations/);
  assert.match(sql, /bootstrap_probe/);
  assert.match(sql, /chat_thread/);
  assert.match(sql, /chat_turn/);
  assert.match(sql, /attachment_json/);
  assert.match(sql, /hub_entry/);
  // Chat is the first thing here that holds what a person typed, so the table names are the first
  // real test of this rule rather than a formality: no domain table arrives by the back door.
  assert.doesNotMatch(sql, /(heart_rate|sleep|nutrition|blood|garmin)/i);
});

/**
 * A thread's turns are the only rows here that are worth deleting, and deleting a thread must take
 * them with it. Legacy had no foreign key and left orphaned messages behind forever — rows nothing
 * could reach and nothing would ever clean up.
 */
/**
 * An attachment column that ever held bytes would put a photo of someone's meal in the only copy of
 * their data, in a place nobody chose. The column takes a reference — kind, name, size — and this is
 * the part of that rule a machine can hold.
 */
test('the attachment column is metadata, and the migration that adds it destroys nothing', () => {
  const migration = MIGRATIONS.find((item) => item.version === 3);
  assert.ok(migration !== undefined);
  assert.match(migration.sql, /ALTER TABLE chat_turn ADD COLUMN/i);
  assert.doesNotMatch(migration.sql, /BLOB/i, 'bytes must never get a column');
});

test('deleting a thread takes its turns with it', () => {
  const sql = MIGRATIONS.map((item) => item.sql).join('\n');
  assert.match(sql, /REFERENCES\s+chat_thread\s*\(\s*id\s*\)\s*ON\s+DELETE\s+CASCADE/i);
});

/**
 * Health data lives only on the device, so a migration that drops or rebuilds a table destroys the
 * only copy. Additive-only is the rule; this is the part a machine can hold.
 */
test('migrations are additive and append-only', () => {
  const versions = MIGRATIONS.map((migration) => migration.version);

  assert.deepEqual(
    versions,
    versions.map((_, index) => index + 1),
    'migration versions must start at 1 and increase by one with no gaps',
  );
  assert.equal(CURRENT_SCHEMA_VERSION, versions[versions.length - 1]);

  for (const migration of MIGRATIONS) {
    assert.doesNotMatch(
      migration.sql,
      /\bDROP\s+(?:TABLE|COLUMN)\b|\bALTER\s+TABLE\s+\S+\s+DROP\b/i,
      `migration ${migration.version} drops data`,
    );
  }
});

/**
 * One entry table for every kind of thing, rather than one table per domain.
 *
 * Legacy kept `nutrition_log`, `blood_panel` and `health_observation` apart, which works while a
 * developer writes every domain and stops working the moment the user can make one. A table per
 * kind here would mean a migration each time a hub learns to hold something — including for hubs
 * nobody has thought of, where there is no developer present to write it.
 */
test('a hub entry is one table with a payload, not a table per domain', () => {
  const migration = MIGRATIONS.find((item) => item.version === 4);
  assert.ok(migration !== undefined);

  assert.match(migration.sql, /CREATE TABLE IF NOT EXISTS hub\b/);
  assert.match(migration.sql, /CREATE TABLE IF NOT EXISTS hub_entry\b/);
  assert.match(migration.sql, /payload_json TEXT NOT NULL/);
  assert.doesNotMatch(migration.sql, /BLOB/i, 'bytes must never get a column');
});

/**
 * `hub_entry.hub_id` deliberately has NO foreign key: the seeded hubs live in `catalog.ts` as code
 * and have no row in `hub`, so a reference would reject the common case. This asserts the absence
 * on purpose — the chat tables one migration earlier set the opposite precedent, and someone
 * "fixing the inconsistency" would break every entry on a seeded hub.
 */
test('an entry may point at a hub that ships in code rather than in the table', () => {
  const migration = MIGRATIONS.find((item) => item.version === 4);
  assert.ok(migration !== undefined);
  assert.doesNotMatch(migration.sql, /REFERENCES\s+hub\s*\(/i);
});

/**
 * One person, enforced by the schema rather than by everything that writes to it.
 *
 * `CHECK (id = 1)` is the trick `bootstrap_probe` uses in migration 1. A table that could hold two
 * profiles would eventually hold two, with nothing to say which was current.
 */
test('there can only be one profile', () => {
  const migration = MIGRATIONS.find((item) => item.version === 5);
  assert.ok(migration !== undefined);

  assert.match(migration.sql, /CREATE TABLE IF NOT EXISTS profile\b/);
  assert.match(migration.sql, /CHECK \(id = 1\)/);
});

/**
 * A birth year and a sex are the two inputs a published formula takes. They are not a medical
 * record, and this table must never become one — Legacy's profile carried allergies, chronic
 * diseases and supplements, which is exactly that drift. Anything of that kind belongs in the
 * Medical condition hub as an entry somebody chose to make.
 */
test('the profile holds two answers and no medical history', () => {
  const migration = MIGRATIONS.find((item) => item.version === 5);
  assert.ok(migration !== undefined);

  assert.doesNotMatch(migration.sql, /(allerg|disease|condition|medication|supplement|diagnos)/i);
  assert.doesNotMatch(migration.sql, /(name|email|phone)/i, 'the profile grew an identifier');
});

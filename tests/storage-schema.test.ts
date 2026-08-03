import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CREATE_MIGRATION_TABLE_SQL,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
} from '../src/infrastructure/storage/schema';

test('the schema is versioned and contains no legacy health tables', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 2);
  assert.deepEqual(
    MIGRATIONS.map((migration) => migration.version),
    [1, 2],
  );

  const sql = `${CREATE_MIGRATION_TABLE_SQL}\n${MIGRATIONS.map((item) => item.sql).join('\n')}`;
  assert.match(sql, /schema_migrations/);
  assert.match(sql, /bootstrap_probe/);
  assert.match(sql, /chat_thread/);
  assert.match(sql, /chat_turn/);
  // Chat is the first thing here that holds what a person typed, so the table names are the first
  // real test of this rule rather than a formality: no domain table arrives by the back door.
  assert.doesNotMatch(sql, /(heart_rate|sleep|nutrition|blood|garmin)/i);
});

/**
 * A thread's turns are the only rows here that are worth deleting, and deleting a thread must take
 * them with it. Legacy had no foreign key and left orphaned messages behind forever — rows nothing
 * could reach and nothing would ever clean up.
 */
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

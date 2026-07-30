import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CREATE_MIGRATION_TABLE_SQL,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
} from '../src/infrastructure/storage/schema';

test('bootstrap schema is versioned and contains no legacy health tables', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 1);
  assert.deepEqual(
    MIGRATIONS.map((migration) => migration.version),
    [1],
  );

  const sql = `${CREATE_MIGRATION_TABLE_SQL}\n${MIGRATIONS.map((item) => item.sql).join('\n')}`;
  assert.match(sql, /schema_migrations/);
  assert.match(sql, /bootstrap_probe/);
  assert.doesNotMatch(sql, /(heart_rate|sleep|nutrition|blood|garmin)/i);
});

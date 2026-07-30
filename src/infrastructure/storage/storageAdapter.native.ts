import * as SQLite from 'expo-sqlite';

import type { StorageAdapter } from '@/core/storage';
import {
  CREATE_MIGRATION_TABLE_SQL,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
} from '@/infrastructure/storage/schema';

export const storageAdapter: StorageAdapter = {
  async initialize() {
    try {
      const database = await SQLite.openDatabaseAsync('ol1-bootstrap.db');
      await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await database.execAsync(CREATE_MIGRATION_TABLE_SQL);

      const current = await database.getFirstAsync<{ version: number }>(
        'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations',
      );
      const currentVersion = current?.version ?? 0;

      if (currentVersion > CURRENT_SCHEMA_VERSION) {
        return { schemaVersion: null, status: 'error' };
      }

      for (const migration of MIGRATIONS) {
        if (migration.version <= currentVersion) continue;
        await database.withTransactionAsync(async () => {
          await database.execAsync(migration.sql);
          await database.runAsync(
            'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
            migration.version,
            new Date().toISOString(),
          );
        });
      }

      return { schemaVersion: CURRENT_SCHEMA_VERSION, status: 'ok' };
    } catch {
      return { schemaVersion: null, status: 'error' };
    }
  },
};

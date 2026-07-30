export const CURRENT_SCHEMA_VERSION = 1;

export const CREATE_MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  );
`;

export const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS bootstrap_probe (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        created_at TEXT NOT NULL
      );
    `,
  },
] as const;

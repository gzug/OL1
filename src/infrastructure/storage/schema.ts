export const CURRENT_SCHEMA_VERSION = 2;

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
  {
    /**
     * Chat threads and their turns.
     *
     * Shape ported from Legacy `data/coach/chatStore.ts`. Two differences, both deliberate:
     *
     * - `coach_ids` is a comma-separated list, not a single `coach_id`. A thread here can have
     *   several coaches at once, which is what the Open Table is; Legacy encoded that in the
     *   conversation id and could not query it.
     * - `ON DELETE CASCADE`. Legacy had no foreign key, so deleting a conversation left its
     *   messages behind forever — invisible rows that only grow.
     */
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS chat_thread (
        id TEXT PRIMARY KEY NOT NULL,
        coach_ids TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_turn (
        id TEXT PRIMARY KEY NOT NULL,
        thread_id TEXT NOT NULL REFERENCES chat_thread (id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('assistant', 'user')),
        text TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS chat_turn_thread_idx
        ON chat_turn (thread_id, created_at);
    `,
  },
] as const;

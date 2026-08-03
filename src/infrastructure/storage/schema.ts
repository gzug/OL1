export const CURRENT_SCHEMA_VERSION = 3;

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
  {
    /**
     * What was attached to a turn — kind, name and size, never the bytes. A photo of a meal is
     * health data, and a column holding it would outlive the question it answered in a place nobody
     * chose. `ADD COLUMN` rather than a rebuild: the additive-only rule is what keeps a migration
     * from being the thing that destroys the only copy of someone's data.
     */
    version: 3,
    sql: `ALTER TABLE chat_turn ADD COLUMN attachment_json TEXT;`,
  },
] as const;

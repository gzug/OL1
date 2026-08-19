export const CURRENT_SCHEMA_VERSION = 4;

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
  {
    /**
     * Hubs the user made, and the things that happen inside any hub.
     *
     * **Two tables, not one per domain.** A meal, a run and a blood panel are all "something that
     * happened in a hub at a time", and giving each its own table would mean a migration every time
     * a hub learns to hold something — including for hubs the user invents, where no developer is
     * present to write one. The kind-specific fields go in `payload_json`, shaped at the edges.
     *
     * **No foreign key from `hub_entry` to `hub`, and that is deliberate.** The six seeded hubs live
     * in `src/ui/hubs/catalog.ts` as code and have no row here, so most entries point at a hub id
     * this table has never seen. A reference would reject exactly the common case. It is the one
     * place this schema knowingly gives up an integrity guarantee, and the price is that deleting a
     * user's hub has to delete its entries in the same transaction rather than by cascade — written
     * down here because the chat tables above set the opposite precedent one migration earlier.
     *
     * `recorded_at` is when the thing HAPPENED. A meal logged at midnight for lunch belongs to
     * lunchtime, and a cockpit that orders by when a row was written would tell that wrong.
     */
    version: 4,
    sql: `
      CREATE TABLE IF NOT EXISTS hub (
        id TEXT PRIMARY KEY NOT NULL,
        label TEXT NOT NULL,
        coach_id TEXT,
        parent_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hub_entry (
        id TEXT PRIMARY KEY NOT NULL,
        hub_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        source TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS hub_entry_hub_idx
        ON hub_entry (hub_id, recorded_at);
    `,
  },
] as const;

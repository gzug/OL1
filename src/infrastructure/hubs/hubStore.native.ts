/**
 * Hub persistence on a device, in the same SQLite file the chat and the bootstrap probe use.
 *
 * Nothing here is ported — Legacy has no equivalent. It kept one table per domain
 * (`nutrition_log`, `blood_panel`, `health_observation`), which works when a developer writes every
 * domain and stops working the moment the user can make one. Schema v4's note argues that trade.
 *
 * The two corrections `chatStore.native.ts` paid for are carried over rather than re-learned:
 * `INSERT OR IGNORE` so "make sure it exists" is idempotent, and a cap that sorts BEFORE it limits,
 * so a long hub gives back its newest entries rather than its oldest.
 *
 * Migrations are `storageAdapter.initialize()`'s job. Calling it here rather than writing a second
 * migration runner is the whole reason it is idempotent.
 */

import * as SQLite from 'expo-sqlite';

import type { HubEntry, HubStore, StoredHub } from '@/core/hubs';
import { storageAdapter } from '@/infrastructure/storage/storageAdapter';

/** Enough for any cockpit that has not asked for a number. A hub with more is paged by the caller. */
const ENTRY_LIMIT = 500;

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

function database(): Promise<SQLite.SQLiteDatabase> {
  opening ??= (async () => {
    await storageAdapter.initialize();
    return SQLite.openDatabaseAsync('ol1-bootstrap.db');
  })();
  return opening;
}

type HubRow = {
  coach_id: string | null;
  created_at: string;
  id: string;
  label: string;
  parent_id: string | null;
};

type EntryRow = {
  hub_id: string;
  id: string;
  kind: string;
  payload_json: string;
  recorded_at: string;
  source: string;
};

function toHub(row: HubRow): StoredHub {
  return {
    ...(row.coach_id === null ? {} : { coachId: row.coach_id }),
    createdAt: row.created_at,
    id: row.id,
    label: row.label,
    ...(row.parent_id === null ? {} : { parentId: row.parent_id }),
  };
}

/**
 * A half-written or hand-edited payload must not take a whole hub's history down with it.
 *
 * The same defence `chatStore.native.ts` puts around its attachment column, and it matters more
 * here: a payload is the only part of an entry whose shape this layer does not police, so it is the
 * only part that can arrive malformed. An entry whose payload will not parse still has its kind, its
 * time and its source, which is enough for a cockpit to say something honest about it.
 */
function parsePayload(json: string): Readonly<Record<string, unknown>> {
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function toEntry(row: EntryRow): HubEntry {
  return {
    hubId: row.hub_id,
    id: row.id,
    kind: row.kind,
    payload: parsePayload(row.payload_json),
    recordedAt: row.recorded_at,
    source: row.source,
  };
}

export const hubStore: HubStore = {
  async addEntry(entry) {
    const db = await database();
    await db.runAsync(
      `INSERT OR REPLACE INTO hub_entry (id, hub_id, kind, payload_json, recorded_at, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      entry.id,
      entry.hubId,
      entry.kind,
      JSON.stringify(entry.payload),
      entry.recordedAt,
      entry.source,
    );
  },

  async createHub(hub) {
    const db = await database();
    await db.runAsync(
      `INSERT OR IGNORE INTO hub (id, label, coach_id, parent_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      hub.id,
      hub.label,
      hub.coachId ?? null,
      hub.parentId ?? null,
      hub.createdAt,
    );
  },

  async listEntries(hubId, limit) {
    const db = await database();
    const rows = await db.getAllAsync<EntryRow>(
      `SELECT id, hub_id, kind, payload_json, recorded_at, source
         FROM hub_entry
        WHERE hub_id = ?
        ORDER BY recorded_at DESC
        LIMIT ?`,
      hubId,
      Math.min(limit ?? ENTRY_LIMIT, ENTRY_LIMIT),
    );
    return rows.map(toEntry);
  },

  async listHubs() {
    const db = await database();
    const rows = await db.getAllAsync<HubRow>(
      `SELECT id, label, coach_id, parent_id, created_at FROM hub ORDER BY created_at ASC`,
    );
    return rows.map(toHub);
  },

  async readBrief(hubId) {
    const db = await database();
    const row = await db.getFirstAsync<{ brief: string }>(
      `SELECT brief FROM hub_brief WHERE hub_id = ?`,
      [hubId],
    );
    return row?.brief ?? null;
  },

  /**
   * `INSERT OR REPLACE`, because writing again is changing your mind rather than adding an opinion.
   * Empty clears the row, so "no brief" is one state and not two that render the same.
   */
  async writeBrief(hubId, brief) {
    const db = await database();
    const text = brief.trim();

    if (text.length === 0) {
      await db.runAsync(`DELETE FROM hub_brief WHERE hub_id = ?`, [hubId]);
      return;
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO hub_brief (hub_id, brief, updated_at) VALUES (?, ?, ?)`,
      [hubId, text, new Date().toISOString()],
    );
  },

  /**
   * `INSERT OR IGNORE`, so hiding an already-hidden hub is a no-op rather than a constraint error.
   *
   * **No statement here reads or writes `hub_entry`.** Hiding is a row in `hidden_hub` and nothing
   * else — see migration 7 for why that is the whole point.
   */
  async hideHub(hubId) {
    const db = await database();
    await db.runAsync(`INSERT OR IGNORE INTO hidden_hub (hub_id, hidden_at) VALUES (?, ?)`, [
      hubId,
      new Date().toISOString(),
    ]);
  },

  async listHiddenHubs() {
    const db = await database();
    const rows = await db.getAllAsync<{ hub_id: string }>(`SELECT hub_id FROM hidden_hub`);
    return rows.map((row) => row.hub_id);
  },

  /** The one delete in this feature, and it destroys a row that says "put away". */
  async unhideHub(hubId) {
    const db = await database();
    await db.runAsync(`DELETE FROM hidden_hub WHERE hub_id = ?`, [hubId]);
  },
};

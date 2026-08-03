/**
 * Chat persistence on a device, in the same SQLite file the bootstrap probe uses.
 *
 * PORTED from Legacy `data/coach/chatStore.ts`, including the two corrections its comments record
 * paying for:
 *
 * - **`INSERT OR IGNORE` on the thread.** Thread ids are deterministic, so "make sure it exists" is
 *   the call, and it has to be idempotent. Legacy used a plain INSERT guarded by an existence check;
 *   when that check went stale the UNIQUE constraint threw on every send and the thread wedged —
 *   the user's message was never persisted at all.
 * - **`ORDER BY created_at DESC LIMIT 200`, re-sorted ascending.** Capping without the inner sort
 *   loads the OLDEST 200 turns of a long thread, so the screen shows a conversation from months ago
 *   and none of today's.
 *
 * Migrations are `storageAdapter.initialize()`'s job, not this file's — calling it here rather than
 * writing a second migration runner is the whole reason it is idempotent.
 */

import * as SQLite from 'expo-sqlite';

import type { ChatStore, ChatThread } from '@/core/chat';
import { storageAdapter } from '@/infrastructure/storage/storageAdapter';

const TURN_LIMIT = 200;

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

function database(): Promise<SQLite.SQLiteDatabase> {
  opening ??= (async () => {
    await storageAdapter.initialize();
    const db = await SQLite.openDatabaseAsync('ol1-bootstrap.db');
    // Without this the schema's ON DELETE CASCADE is inert: SQLite parses foreign keys always and
    // enforces them only when asked, per connection.
    await db.execAsync('PRAGMA foreign_keys = ON;');
    return db;
  })();
  return opening;
}

type ThreadRow = { coach_ids: string; created_at: string; id: string; updated_at: string };
type TurnRow = { id: string; role: string; text: string };

function toThread(row: ThreadRow): ChatThread {
  return {
    coachIds: row.coach_ids.length === 0 ? [] : row.coach_ids.split(','),
    createdAt: row.created_at,
    id: row.id,
    updatedAt: row.updated_at,
  };
}

export const chatStore: ChatStore = {
  async appendTurn(threadId, turn) {
    const db = await database();
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO chat_turn (id, thread_id, role, text, created_at) VALUES (?, ?, ?, ?, ?);',
      turn.id,
      threadId,
      turn.role,
      turn.text,
      now,
    );
    await db.runAsync('UPDATE chat_thread SET updated_at = ? WHERE id = ?;', now, threadId);
  },

  async createThread(thread) {
    const db = await database();
    await db.runAsync(
      'INSERT OR IGNORE INTO chat_thread (id, coach_ids, created_at, updated_at) VALUES (?, ?, ?, ?);',
      thread.id,
      thread.coachIds.join(','),
      thread.createdAt,
      thread.updatedAt,
    );
  },

  async listThreads() {
    const db = await database();
    const rows = await db.getAllAsync<ThreadRow>(
      'SELECT id, coach_ids, created_at, updated_at FROM chat_thread ORDER BY updated_at DESC;',
    );
    return rows.map(toThread);
  },

  async readTurns(threadId) {
    const db = await database();
    const rows = await db.getAllAsync<TurnRow>(
      `SELECT id, role, text FROM (
         SELECT id, role, text, created_at
         FROM chat_turn
         WHERE thread_id = ?
         ORDER BY created_at DESC
         LIMIT ${TURN_LIMIT}
       ) ORDER BY created_at ASC;`,
      threadId,
    );
    return rows.map((row) => ({
      id: row.id,
      role: row.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      text: row.text,
    }));
  },
};

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

import type { AttachmentRef } from '@/core/attachments';
import type { ChatStore, ChatThreadSummary } from '@/core/chat';
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

type ThreadRow = {
  coach_ids: string;
  created_at: string;
  id: string;
  preview: string | null;
  updated_at: string;
};
type TurnRow = { attachment_json: string | null; id: string; role: string; text: string };

function toSummary(row: ThreadRow): ChatThreadSummary {
  return {
    coachIds: row.coach_ids.length === 0 ? [] : row.coach_ids.split(','),
    createdAt: row.created_at,
    id: row.id,
    preview: row.preview ?? '',
    updatedAt: row.updated_at,
  };
}

/** A hand-edited or half-written column must not take a whole conversation down with it. */
function readAttachment(json: string | null): { attachment?: AttachmentRef } {
  if (json === null) return {};
  try {
    return { attachment: JSON.parse(json) as AttachmentRef };
  } catch {
    return {};
  }
}

export const chatStore: ChatStore = {
  async appendTurn(threadId, turn) {
    const db = await database();
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO chat_turn (id, thread_id, role, text, created_at, attachment_json) VALUES (?, ?, ?, ?, ?, ?);',
      turn.id,
      threadId,
      turn.role,
      turn.text,
      now,
      turn.attachment === undefined ? null : JSON.stringify(turn.attachment),
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
    // The preview comes from a correlated subquery rather than a second round trip per row: the
    // history list is one query whether there are three threads or three hundred.
    const rows = await db.getAllAsync<ThreadRow>(
      `SELECT t.id, t.coach_ids, t.created_at, t.updated_at,
              (SELECT text FROM chat_turn
                WHERE thread_id = t.id AND role = 'user'
                ORDER BY created_at ASC LIMIT 1) AS preview
         FROM chat_thread t
        ORDER BY t.updated_at DESC;`,
    );
    return rows.map(toSummary);
  },

  async readTurns(threadId) {
    const db = await database();
    const rows = await db.getAllAsync<TurnRow>(
      `SELECT id, role, text, attachment_json FROM (
         SELECT id, role, text, attachment_json, created_at
         FROM chat_turn
         WHERE thread_id = ?
         ORDER BY created_at DESC
         LIMIT ${TURN_LIMIT}
       ) ORDER BY created_at ASC;`,
      threadId,
    );
    return rows.map((row) => ({
      ...readAttachment(row.attachment_json),
      id: row.id,
      role: row.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      text: row.text,
    }));
  },
};

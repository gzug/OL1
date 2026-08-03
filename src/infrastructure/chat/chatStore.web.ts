/**
 * Chat persistence on the web preview, in `localStorage`.
 *
 * Why not SQLite here too: `storageAdapter.web.ts` is a deliberate stub — the web build has no
 * database and the spec calls web a fixture-only preview. This does not change that. It exists
 * because the web preview is the surface the owners actually look at, and a page reload that wipes
 * the conversation reads as a bug rather than as "web has no storage".
 *
 * What it is NOT: durable storage for health data. `localStorage` is per-browser, cleared by the
 * user without warning, and not a place anything of consequence belongs. Threads and their text
 * only — the same things the preview invents fixtures for.
 *
 * Every access is guarded. Expo's static export prerenders these routes in Node, where `window`
 * does not exist, and an unguarded `localStorage` there fails the `export:web` stage of the check.
 */

import type { ChatStore, ChatThread, ChatTurn } from '@/core/chat';

const THREADS_KEY = 'ol1.chat.threads';
const TURNS_PREFIX = 'ol1.chat.turns.';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    // Private browsing and blocked third-party storage throw on access rather than returning null.
    return null;
  }
}

function read<T>(key: string, fallback: T): T {
  const store = storage();
  if (store === null) return fallback;
  const raw = store.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // A half-written or hand-edited value is not worth crashing a screen over.
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  const store = storage();
  if (store === null) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded. The conversation stays on screen; only its persistence is lost.
  }
}

export const chatStore: ChatStore = {
  async appendTurn(threadId, turn) {
    const turns = read<ChatTurn[]>(`${TURNS_PREFIX}${threadId}`, []);
    write(`${TURNS_PREFIX}${threadId}`, [...turns, turn]);

    const threads = read<ChatThread[]>(THREADS_KEY, []);
    write(
      THREADS_KEY,
      threads.map((thread) =>
        thread.id === threadId ? { ...thread, updatedAt: new Date().toISOString() } : thread,
      ),
    );
  },

  async createThread(thread) {
    const threads = read<ChatThread[]>(THREADS_KEY, []);
    // Idempotent, matching the native store's INSERT OR IGNORE.
    if (threads.some((existing) => existing.id === thread.id)) return;
    write(THREADS_KEY, [...threads, thread]);
  },

  async listThreads() {
    return read<ChatThread[]>(THREADS_KEY, []).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  },

  async readTurns(threadId) {
    return read<ChatTurn[]>(`${TURNS_PREFIX}${threadId}`, []);
  },
};

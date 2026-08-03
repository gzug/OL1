/**
 * The fallback chat store: in memory, for the bundles and the tests that have neither SQLite nor a
 * browser. `chatStore.native.ts` and `chatStore.web.ts` are what actually ship; Metro picks those
 * per platform and this one is what `tsc` and `node --test` see.
 *
 * Same arrangement as `storageAdapter.ts` beside it, and for the same reason: the tests then cover
 * the shape of the port rather than a mock of it.
 */

import type { ChatStore, ChatThread, ChatTurn } from '@/core/chat';

export function createMemoryChatStore(): ChatStore {
  const threads = new Map<string, ChatThread>();
  const turns = new Map<string, ChatTurn[]>();

  return {
    async appendTurn(threadId, turn) {
      const existing = turns.get(threadId) ?? [];
      turns.set(threadId, [...existing, turn]);
      const thread = threads.get(threadId);
      if (thread !== undefined) {
        threads.set(threadId, { ...thread, updatedAt: new Date().toISOString() });
      }
    },

    async createThread(thread) {
      // Idempotent, matching the native store's INSERT OR IGNORE. Overwriting here would reset
      // createdAt every time a thread is reopened, and reorder the history list on read.
      if (!threads.has(thread.id)) threads.set(thread.id, thread);
    },

    async listThreads() {
      return [...threads.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async readTurns(threadId) {
      return turns.get(threadId) ?? [];
    },
  };
}

export const chatStore: ChatStore = createMemoryChatStore();

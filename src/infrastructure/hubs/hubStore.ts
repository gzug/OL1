/**
 * The fallback hub store: in memory, for the bundles and the tests that have neither SQLite nor a
 * browser. `hubStore.native.ts` and `hubStore.web.ts` are what actually ship; Metro picks those per
 * platform and this one is what `tsc` and `node --test` see.
 *
 * The same arrangement as `chatStore.ts` beside it, for the same reason: the tests then cover the
 * shape of the port rather than a mock of it.
 */

import type { HubEntry, HubStore, StoredHub } from '@/core/hubs';

export function createMemoryHubStore(): HubStore {
  const hubs = new Map<string, StoredHub>();
  const entries: HubEntry[] = [];
  const hidden = new Set<string>();

  return {
    async addEntry(entry) {
      entries.push(entry);
    },

    async createHub(hub) {
      // Idempotent, matching the native store's INSERT OR IGNORE. Overwriting would reset
      // createdAt every time the flow is reopened, and reorder the ring on the next read.
      if (!hubs.has(hub.id)) hubs.set(hub.id, hub);
    },

    async listEntries(hubId, limit) {
      const found = entries
        .filter((entry) => entry.hubId === hubId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
      return limit === undefined ? found : found.slice(0, limit);
    },

    async listHubs() {
      return [...hubs.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    // Hiding never touches `entries`. That is the whole contract — see migration 7.
    async hideHub(hubId) {
      hidden.add(hubId);
    },

    async listHiddenHubs() {
      return [...hidden];
    },

    async unhideHub(hubId) {
      hidden.delete(hubId);
    },
  };
}

export const hubStore: HubStore = createMemoryHubStore();

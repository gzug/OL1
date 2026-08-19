/**
 * Hub persistence on the web preview, in `localStorage`.
 *
 * Why not SQLite here too: `storageAdapter.web.ts` is a deliberate stub — the web build has no
 * database and the spec calls web a fixture-only preview. This does not change that. It exists
 * because the web preview is the surface the owners actually look at, and a hub you just created
 * disappearing on reload reads as a bug rather than as "web has no storage".
 *
 * What it is NOT: durable storage for health data. `localStorage` is per-browser, cleared by the
 * user without warning, and not a place anything of consequence belongs. The same words as
 * `chatStore.web.ts`, and they are just as true of a logged meal as of a typed message — arguably
 * more so, which is why the limit is worth restating rather than referring to.
 *
 * Every access is guarded. Expo's static export prerenders these routes in Node, where `window`
 * does not exist, and an unguarded `localStorage` there fails the `export:web` stage of the check.
 */

import type { HubEntry, HubStore, StoredHub } from '@/core/hubs';

const HUBS_KEY = 'ol1.hubs';
const ENTRIES_PREFIX = 'ol1.hub.entries.';

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
    // Quota exceeded. What is on screen stays; only its persistence is lost.
  }
}

export const hubStore: HubStore = {
  async addEntry(entry) {
    const key = `${ENTRIES_PREFIX}${entry.hubId}`;
    const existing = read<HubEntry[]>(key, []).filter((item) => item.id !== entry.id);
    write(key, [...existing, entry]);
  },

  async createHub(hub) {
    const hubs = read<StoredHub[]>(HUBS_KEY, []);
    // Idempotent, matching the native store's INSERT OR IGNORE.
    if (hubs.some((existing) => existing.id === hub.id)) return;
    write(HUBS_KEY, [...hubs, hub]);
  },

  async listEntries(hubId, limit) {
    const found = read<HubEntry[]>(`${ENTRIES_PREFIX}${hubId}`, []).sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt),
    );
    return limit === undefined ? found : found.slice(0, limit);
  },

  async listHubs() {
    return read<StoredHub[]>(HUBS_KEY, []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
};

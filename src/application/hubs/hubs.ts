/**
 * The only thing a screen calls to remember a hub or something that happened in one.
 *
 * Screens and routes never reach past this file — SQLite and `localStorage` both sit behind it,
 * which is the boundary `scripts/check-boundaries.mjs` enforces. Same shape and same reasoning as
 * `application/chat/coachChat.ts` beside it.
 *
 * **This layer deals in `core` types only.** It does not know about `SEED_HUBS`, ring order, or what
 * a cockpit looks like — merging what is stored with what ships is `src/ui/hubs/mergeHubs.ts`'s job,
 * and it lives up there because the catalog is a UI concern. An application module reaching into
 * `src/ui/` would invert the one dependency the layers exist to keep straight.
 */

import type { HubEntry, HubStore, StoredHub } from '@/core/hubs';
import { hubStore as defaultStore } from '@/infrastructure/hubs/hubStore';

/** Short, and collision-resistant enough for one device. The same shape chat uses for a turn id. */
export function entryId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export type Hubs = {
  /**
   * Record something that happened. `recordedAt` defaults to now, and a caller that knows better —
   * a meal logged at midnight for lunch, a session imported from last Tuesday — passes the real one.
   */
  add(
    hubId: string,
    kind: string,
    payload: Readonly<Record<string, unknown>>,
    options?: { recordedAt?: string; source?: string },
  ): Promise<HubEntry>;
  create(hub: Omit<StoredHub, 'createdAt'>): Promise<StoredHub>;
  entries(hubId: string, limit?: number): Promise<readonly HubEntry[]>;
  list(): Promise<readonly StoredHub[]>;

  /** How a person wants to be coached in this hub, in their own words. Empty clears it. */
  brief(hubId: string): Promise<string | null>;
  setBrief(hubId: string, brief: string): Promise<void>;

  /** Put a hub away, and bring it back. Neither one touches a single entry. */
  hide(hubId: string): Promise<void>;
  hidden(): Promise<readonly string[]>;
  unhide(hubId: string): Promise<void>;
};

export function createHubs(store: HubStore = defaultStore): Hubs {
  return {
    async add(hubId, kind, payload, options) {
      const entry: HubEntry = {
        hubId,
        id: entryId(),
        kind,
        payload,
        recordedAt: options?.recordedAt ?? new Date().toISOString(),
        source: options?.source ?? 'manual',
      };
      await store.addEntry(entry);
      return entry;
    },

    async create(hub) {
      const stored: StoredHub = { ...hub, createdAt: new Date().toISOString() };
      await store.createHub(stored);
      return stored;
    },

    entries: (hubId, limit) => store.listEntries(hubId, limit),
    brief: (hubId) => store.readBrief(hubId),
    setBrief: (hubId, brief) => store.writeBrief(hubId, brief),
    hidden: () => store.listHiddenHubs(),
    hide: (hubId) => store.hideHub(hubId),
    unhide: (hubId) => store.unhideHub(hubId),

    list: () => store.listHubs(),
  };
}

export const hubs: Hubs = createHubs();

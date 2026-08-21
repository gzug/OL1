/**
 * What a hub holds, as types and ports. No implementations and no imports, the same law as
 * `chat.ts` and `attachments.ts` — so this file can never join an import cycle.
 *
 * Two things live here, and the split matters. A **hub** is a place: the six that ship are seed data
 * in `src/ui/hubs/catalog.ts` and are never written here, so every row this store holds is one the
 * user made. An **entry** is something that happened in a hub at a time — a meal, a session, a
 * panel, a weigh-in, a note.
 *
 * `kind` is a plain string rather than a union of the kinds we can name today. A user can create a
 * hub, and a hub nobody anticipated holds entries nobody anticipated; a closed union would mean the
 * only hubs that can hold anything are the ones a developer thought of first. The same argument the
 * catalog already makes for `HubId`.
 */

/** A hub the user made. The seeded ones are code, not rows — see the note above. */
export type StoredHub = {
  /** A user-made hub gets its own coach, so this is set. Optional for the shape's sake only. */
  readonly coachId?: string;
  readonly createdAt: string;
  readonly id: string;
  readonly label: string;
  /** Set when it was made inside another hub. */
  readonly parentId?: string;
};

/**
 * One thing that happened in a hub.
 *
 * `payload` is deliberately untyped here and shaped by `kind` at the edges — a meal's payload is the
 * shape `src/ui/meals/nutrition.ts` already defines, and this file has no business knowing that.
 * What this layer guarantees is the four things every entry has regardless of kind: which hub, what
 * kind, when it happened, and where it came from.
 */
export type HubEntry = {
  readonly hubId: string;
  readonly id: string;
  /** 'meal', 'session', 'panel', 'weight', 'note' — and whatever a user's own hub needs. */
  readonly kind: string;
  readonly payload: Readonly<Record<string, unknown>>;
  /** ISO 8601. **When the thing happened**, not when it was typed. */
  readonly recordedAt: string;
  /** How it got here: 'manual', 'chat', 'photo'. Shown, never guessed at. */
  readonly source: string;
};

export interface HubStore {
  addEntry(entry: HubEntry): Promise<void>;
  /** Idempotent, matching the native store's INSERT OR IGNORE. */
  createHub(hub: StoredHub): Promise<void>;
  /** Newest first. `limit` is the cockpit's concern; absent means all of them. */
  listEntries(hubId: string, limit?: number): Promise<readonly HubEntry[]>;
  listHubs(): Promise<readonly StoredHub[]>;

  /**
   * Put a hub away, and bring it back. **Neither one touches an entry.**
   *
   * `hide` is idempotent, because a screen that hides an already-hidden hub should do nothing
   * rather than fail. So is `unhide`.
   */
  hideHub(hubId: string): Promise<void>;
  listHiddenHubs(): Promise<readonly string[]>;
  unhideHub(hubId: string): Promise<void>;
}

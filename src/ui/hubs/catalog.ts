/**
 * The hub and coach catalog.
 *
 * Hubs used to be a fixed union of six ids. They are data now, because the owner asked for hubs the
 * user can create — from Home, and from inside Activity for exercise types. A hub that only exists
 * once someone taps "new" cannot have a screen written for it in advance, so nothing here may be
 * keyed on a literal hub id ever again.
 *
 * What that costs: the compiler no longer catches a typo'd hub id, and `HUBS.find(...)` can return
 * undefined where it previously could not. Both are handled at the one place it matters, the hub
 * route, which already had to answer for an unknown `[id]` segment. What it buys is the only thing
 * that makes user-created hubs possible at all.
 *
 * FIXTURES — the seed data below is invented for layout review. This repository is public. Same law
 * as `src/ui/mockup/fixtures.ts`: shape and cadence, never values or causation. Not derived from
 * any person. Nothing here is a health statement.
 */

export type CoachId = string;
export type HubId = string;

/**
 * One coach per hub. The user picks coaches, never models — model routing stays automatic and
 * invisible, so nothing on a coach names a provider or a model.
 */
export type Coach = {
  /** One line, present tense, what this coach is responsible for. Shown in the selector. */
  readonly focus: string;
  readonly id: CoachId;
  readonly name: string;
};

export type HubOrigin = 'builtIn' | 'user';

/**
 * What a place on the ring is for.
 *
 * `domain` is every hub in the ordinary sense: it has a coach, a cockpit, and data of its own.
 * `table` is the Open Table, which the owner asked to sit on the ring "as one of the hubs" rather
 * than as a button at the bottom. It has no coach of its own because it is the one that reaches
 * every coach, and no cockpit because it holds no data — so it is a place on the ring and not a
 * hub, and the type says which.
 */
export type HubRole = 'domain' | 'table';

export type HubDefinition = {
  /** Absent only for the Open Table, which reaches every coach rather than having one. */
  readonly coachId?: CoachId;
  readonly id: HubId;
  readonly label: string;
  /**
   * Set when this hub lives inside another. Activity's exercise types are the only seeded case, and
   * the relation is deliberately flat rather than a nested tree: a user adding a hub writes one row,
   * and a flat list is what a store can hold without a migration when nesting goes deeper.
   */
  readonly parentId?: HubId;
  readonly origin: HubOrigin;
  /** Defaults to `domain`. Only the Open Table is anything else. */
  readonly role?: HubRole;
};

/**
 * Coaches.
 *
 * PORTED from Legacy `data/demo/demoPreviewFixtures.ts`, which already carried exactly the shape the
 * owner described — one coach per domain, plus a coach per exercise type. Names and focus lines are
 * Legacy's own: Nutrition Expert, Running Coach, Sleep Coach, Longevity Guide, Strength Coach,
 * Cycling Coach, Swimming Coach, Golf Coach.
 *
 * NOT ported, and written here for the first time: `activity`, `body` and `resilience`. Legacy has
 * no umbrella activity coach (it went straight to marathon/gym/cycle/swim/golf) and no body coach at
 * all. Resilience was a Legacy DOMAIN but never had a coach of its own — it was folded into a
 * catch-all called `general`, and a hub whose coach is "general" would be the only one that cannot
 * say what it is for.
 *
 * The hub is called Resilience, not Mind: the owner renamed it on 2026-08-03 to match Legacy, and
 * because the evidence under it is recovery — heart-rate variability and resting heart rate — which
 * "Mind" mis-described.
 *
 * Legacy's system prompts are deliberately not ported. They name a product and a scope that the spec
 * has not settled here, and a prompt is behaviour, not design — it belongs with the Gemini wiring.
 */
export const COACHES: readonly Coach[] = [
  { focus: 'Movement across everything you do.', id: 'activity', name: 'Activity Coach' },
  { focus: 'Nutrition and metabolic context.', id: 'nutrition', name: 'Nutrition Expert' },
  { focus: 'Composition and physical change over time.', id: 'body', name: 'Body Coach' },
  { focus: 'Recovery, and what your body has left in the tank.', id: 'resilience', name: 'Resilience Coach' },
  { focus: 'Long-term health patterns.', id: 'longevity', name: 'Longevity Guide' },
  { focus: 'Sleep rhythm and recovery habits.', id: 'sleep', name: 'Sleep Coach' },
  { focus: 'Training load, pacing, and recovery.', id: 'running', name: 'Running Coach' },
  { focus: 'Strength training and consistency.', id: 'strength', name: 'Strength Coach' },
  { focus: 'Cycling volume and progression.', id: 'cycling', name: 'Cycling Coach' },
  { focus: 'Swimming sessions and recovery.', id: 'swimming', name: 'Swimming Coach' },
  { focus: 'Golf practice and movement.', id: 'golf', name: 'Golf Coach' },
];

/**
 * The seeded hubs.
 *
 * The first six are the orbit, in ring order starting at the right and going clockwise — that order
 * is load-bearing for `src/ui/mockup/geometry.ts` and Labs sits next to the drift number on purpose.
 *
 * The five after them are Activity's exercise types. They are hubs like any other, not a special
 * case: the owner asked to be able to add exercise types the same way as hubs, so modelling them as
 * anything else would mean writing the creation flow twice.
 */
export const SEED_HUBS: readonly HubDefinition[] = [
  { coachId: 'activity', id: 'activity', label: 'Activity', origin: 'builtIn' },
  { coachId: 'nutrition', id: 'nutrition', label: 'Nutrition', origin: 'builtIn' },
  { coachId: 'body', id: 'body', label: 'Body', origin: 'builtIn' },
  { coachId: 'resilience', id: 'resilience', label: 'Resilience', origin: 'builtIn' },
  { coachId: 'longevity', id: 'labs', label: 'Labs', origin: 'builtIn' },
  { coachId: 'sleep', id: 'sleep', label: 'Sleep', origin: 'builtIn' },

  /**
   * The seventh place on the ring. The owner moved it here from a button under the orbit — "on the
   * bottom should just be the chat bar" — so it is one of the seven the ring ships with.
   *
   * It has no coach and no cockpit, and both absences are the point: it is the way to reach EVERY
   * coach, so giving it one of its own would make it a domain competing with the six. Tapping it
   * goes to the chat surface, which `src/app/hub/[id].tsx` routes without Home needing to know.
   */
  { id: 'open-table', label: 'Open Table', origin: 'builtIn', role: 'table' },

  { coachId: 'running', id: 'running', label: 'Running', origin: 'builtIn', parentId: 'activity' },
  { coachId: 'strength', id: 'gym', label: 'Gym', origin: 'builtIn', parentId: 'activity' },
  { coachId: 'cycling', id: 'cycling', label: 'Cycling', origin: 'builtIn', parentId: 'activity' },
  { coachId: 'swimming', id: 'swimming', label: 'Swimming', origin: 'builtIn', parentId: 'activity' },
  { coachId: 'golf', id: 'golf', label: 'Golf', origin: 'builtIn', parentId: 'activity' },
];

/** The hubs in the orbit: top level only. Exercise types live inside Activity, not on the ring. */
export function orbitHubs(hubs: readonly HubDefinition[] = SEED_HUBS): readonly HubDefinition[] {
  return hubs.filter((hub) => hub.parentId === undefined);
}

/** The hubs inside one hub. Empty for every hub that does not split, which is all but Activity. */
export function childHubs(
  parentId: HubId,
  hubs: readonly HubDefinition[] = SEED_HUBS,
): readonly HubDefinition[] {
  return hubs.filter((hub) => hub.parentId === parentId);
}

export function findHub(
  id: HubId,
  hubs: readonly HubDefinition[] = SEED_HUBS,
): HubDefinition | undefined {
  return hubs.find((hub) => hub.id === id);
}

export function findCoach(
  id: CoachId,
  coaches: readonly Coach[] = COACHES,
): Coach | undefined {
  return coaches.find((coach) => coach.id === id);
}

/**
 * The coach a hub opens. Returns undefined rather than falling back to a default coach: a hub
 * silently answered by the wrong coach is worse than a hub that says it has none, and the creation
 * flow is what guarantees a user-made hub gets one.
 */
export function coachForHub(
  id: HubId,
  hubs: readonly HubDefinition[] = SEED_HUBS,
  coaches: readonly Coach[] = COACHES,
): Coach | undefined {
  const hub = findHub(id, hubs);
  if (hub?.coachId === undefined) return undefined;
  return findCoach(hub.coachId, coaches);
}

/** Whether this place on the ring is a domain hub rather than the Open Table. */
export function isDomainHub(hub: HubDefinition): boolean {
  return (hub.role ?? 'domain') === 'domain';
}

/**
 * Who can be at the table, derived from the hub catalog and from nothing else.
 *
 * `src/ui/hubs/catalog.ts` is the one list of coaches. A second array of names written here would
 * be a copy that drifts the first time somebody adds a hub — which is now something the user can do
 * from Home, so "somebody" is not a developer and the drift would ship silently.
 *
 * Grouping falls out of `parentId` for free: a hub inside another is a coach inside another, so an
 * exercise type a user creates inside Exercise appears in the right group without this file
 * learning anything new.
 *
 * Separate from `CoachSelector.tsx` so it can be asserted without rendering React Native.
 */

import {
  SPORT_COACH_IDS,
  childHubs,
  coachForHub,
  findCoach,
  orbitHubs,
  type Coach,
  type HubDefinition,
} from '@/ui/hubs/catalog';

function coachesOf(hubs: readonly { id: string }[]): readonly Coach[] {
  return hubs
    .map((hub) => coachForHub(hub.id))
    .filter((coach): coach is Coach => coach !== undefined);
}

/** One coach per hub on the ring, in ring order. A hub without a coach is simply absent. */
export function hubCoaches(): readonly Coach[] {
  return coachesOf(orbitHubs());
}

/** A hub on the ring that holds other hubs, and the coaches of the hubs it holds. */
export type NestedCoachGroup = {
  readonly coaches: readonly Coach[];
  readonly parent: HubDefinition;
};

/**
 * The coaches that live inside another hub, grouped by the hub they live in.
 *
 * **Only Health record holds another hub now.** Exercise used to hold the five sports, and they
 * stopped being hubs on 2026-08-21 — `docs/decisions/0014`. Their coaches did not go with them, and
 * they are no longer nested; `sportCoaches` below is where they come from instead.
 *
 * Derived by sweeping the ring for hubs that have children, not by listing the two parents here. A
 * user can create a hub inside a hub, and a hard-coded pair would drop that coach out of the
 * selector without anything failing.
 */
export function nestedCoachGroups(): readonly NestedCoachGroup[] {
  return orbitHubs()
    .map((parent) => ({ coaches: coachesOf(childHubs(parent.id)), parent }))
    .filter((group) => group.coaches.length > 0);
}

/** Every nested coach, flattened. The order follows the ring, then the order inside each parent. */
export function nestedCoaches(): readonly Coach[] {
  return nestedCoachGroups().flatMap((group) => [...group.coaches]);
}

/**
 * The sport coaches: running, strength, cycling, swimming, golf.
 *
 * **Listed from `SPORT_COACH_IDS` rather than derived from hubs**, because a sport is a voice and
 * not a room. When the sports stopped being hubs these dropped straight out of `nestedCoaches`, and
 * with them out of `selectableCoaches` — so five coaches existed in the catalog and could not be
 * reached from anywhere. Nothing failed; they were simply gone. That is what this function is for.
 *
 * Which of them a person has NAMED is a different question, answered by `sportCoachesFor` reading
 * entries on Exercise. This is the whole set; that is the subset.
 */
export function sportCoaches(): readonly Coach[] {
  return SPORT_COACH_IDS.map((id) => findCoach(id)).filter(
    (coach): coach is Coach => coach !== undefined,
  );
}

/** Every coach that can be picked, hub coaches first, then nested, then the sports. */
export function selectableCoaches(): readonly Coach[] {
  return [...hubCoaches(), ...nestedCoaches(), ...sportCoaches()];
}

/** The chosen coaches, in catalog order rather than in the order they were tapped. */
export function coachesAtTable(selected: readonly string[]): readonly Coach[] {
  return selectableCoaches().filter((coach) => selected.includes(coach.id));
}

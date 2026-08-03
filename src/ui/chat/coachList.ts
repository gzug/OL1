/**
 * Who can be at the table, derived from the hub catalog and from nothing else.
 *
 * `src/ui/hubs/catalog.ts` is the one list of coaches. A second array of names written here would
 * be a copy that drifts the first time somebody adds a hub — which is now something the user can do
 * from Home, so "somebody" is not a developer and the drift would ship silently.
 *
 * Grouping falls out of `parentId` for free: a hub inside another is a coach inside another, so an
 * exercise type a user creates inside Activity appears in the right group without this file
 * learning anything new.
 *
 * Separate from `CoachSelector.tsx` so it can be asserted without rendering React Native.
 */

import { childHubs, coachForHub, orbitHubs, type Coach } from '@/ui/hubs/catalog';

function coachesOf(hubs: readonly { id: string }[]): readonly Coach[] {
  return hubs
    .map((hub) => coachForHub(hub.id))
    .filter((coach): coach is Coach => coach !== undefined);
}

/** One coach per hub on the ring, in ring order. A hub without a coach is simply absent. */
export function hubCoaches(): readonly Coach[] {
  return coachesOf(orbitHubs());
}

/** Activity's coaches per sport. The only nested group the seed data has. */
export function activityCoaches(): readonly Coach[] {
  return coachesOf(childHubs('activity'));
}

/** Every coach that can be picked, hub coaches first. */
export function selectableCoaches(): readonly Coach[] {
  return [...hubCoaches(), ...activityCoaches()];
}

/** The chosen coaches, in catalog order rather than in the order they were tapped. */
export function coachesAtTable(selected: readonly string[]): readonly Coach[] {
  return selectableCoaches().filter((coach) => selected.includes(coach.id));
}

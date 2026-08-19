/**
 * The hubs that exist: the ones that ship, plus the ones the user made.
 *
 * Pure, and separate from the hook that loads them, so what appears on the ring can be asserted in
 * bare Node — the same reason `coachList.ts` and `geometry.ts` are pure. Getting this wrong is
 * visible as a hub silently missing from Home, which is the kind of thing a rendered screen hides.
 *
 * Three rules, each of which is a decision rather than an implementation detail:
 *
 * 1. **Seeded hubs keep their positions.** They come first, in catalog order, because ring order is
 *    load-bearing geometry and a hub that moves when another is added would make the ring feel
 *    unstable. New ones land after them, oldest first, and the `+` stays last of all — `Orbit` puts
 *    it there rather than this file, because it is not a hub.
 * 2. **A stored hub never overrides a seeded one.** Ids collide only if the seed data grows a hub
 *    with a name someone already used; when it does, the shipped one wins and the stored one is
 *    dropped rather than shadowing a hub with a cockpit and a screen. `newHub.ts` refuses the
 *    collision at creation time, so this is the second line, not the first.
 * 3. **A stored hub gets its own coach.** `newHub.ts` sets `coachId` to the hub's own id; a hub
 *    answered by another hub's coach is exactly the confusion `coachForHub` returning undefined was
 *    written to avoid.
 */

import type { StoredHub } from '@/core/hubs';

import { SEED_HUBS, type Coach, type HubDefinition } from './catalog';

export function toDefinition(hub: StoredHub): HubDefinition {
  return {
    ...(hub.coachId === undefined ? {} : { coachId: hub.coachId }),
    id: hub.id,
    label: hub.label,
    origin: 'user',
    ...(hub.parentId === undefined ? {} : { parentId: hub.parentId }),
  };
}

export function mergeHubs(
  stored: readonly StoredHub[],
  seeded: readonly HubDefinition[] = SEED_HUBS,
): readonly HubDefinition[] {
  const taken = new Set(seeded.map((hub) => hub.id));
  const added = [...stored]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .filter((hub) => !taken.has(hub.id))
    .map(toDefinition);

  return [...seeded, ...added];
}

/**
 * The coach a user's hub brings with it.
 *
 * Built from the hub rather than stored beside it: a name and a focus line are all a coach is, and
 * a second copy of them in the store would be the thing that drifts when a hub is renamed.
 */
export function coachFor(hub: HubDefinition): Coach | undefined {
  if (hub.coachId === undefined || hub.origin !== 'user') return undefined;
  return {
    focus: `Whatever you keep in ${hub.label}.`,
    id: hub.coachId,
    name: `${hub.label} Coach`,
  };
}

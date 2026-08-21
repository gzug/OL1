/**
 * Which hubs are on the ring, and which ones a person has put away.
 *
 * **Hidden, never deleted, and that is the owner's decision — 2026-08-21.** Asked whether hubs
 * should be removable he chose hideable, and it is the right answer for a reason worth writing
 * down: a hub holds a person's meals, sessions and blood panels, and there is no undo button in a
 * database. Hiding is reversible; deleting is a decision somebody makes once, at speed, and cannot
 * take back.
 *
 * So nothing in this file destroys anything. A hidden hub keeps every entry it ever held, and the
 * screen that hides it has to say so — see `hideWarning`.
 *
 * Pure, and separate from `mergeHubs` on purpose. Merging answers "which hubs exist"; this answers
 * "which ones does this person want to see". Folding the second into the first would have meant
 * breaking `mergeHubs`' second rule — that a stored hub never overrides a seeded one — because a
 * seeded hub has no stored row to carry a flag on.
 */

import type { HubDefinition } from '@/ui/hubs/catalog';

/**
 * A hub and everything nested inside it.
 *
 * **Hiding a parent hides its children**, because the children are only reachable through it. Hide
 * Exercise while Running and Gym stay "visible" and they are visible in name only: nothing on any
 * screen leads to them. A person would have hidden one hub and lost three.
 */
export function withDescendants(
  hubs: readonly HubDefinition[],
  id: string,
): readonly string[] {
  const ids = [id];

  // One level is all the catalog has, but a loop costs nothing and a future nesting will not
  // silently orphan a grandchild.
  for (let cursor = 0; cursor < ids.length; cursor += 1) {
    const parent = ids[cursor];
    for (const hub of hubs) {
      if (hub.parentId === parent && !ids.includes(hub.id)) ids.push(hub.id);
    }
  }

  return ids;
}

export function visibleHubs(
  hubs: readonly HubDefinition[],
  hidden: readonly string[],
): readonly HubDefinition[] {
  const away = new Set(hidden);
  return hubs.filter((hub) => !away.has(hub.id));
}

export function hiddenHubs(
  hubs: readonly HubDefinition[],
  hidden: readonly string[],
): readonly HubDefinition[] {
  const away = new Set(hidden);
  return hubs.filter((hub) => away.has(hub.id));
}

/**
 * What hiding this hub will actually do, in the words a person needs before they do it.
 *
 * **It has to name what stays**, because "hide" is a word people read as "get rid of", and the
 * whole point of choosing hideable over deletable is lost if the screen does not say that the data
 * survives. And it has to name the children, because that is the part nobody expects.
 */
export function hideWarning(
  hubs: readonly HubDefinition[],
  id: string,
  entryCount: number,
): string {
  const children = withDescendants(hubs, id)
    .slice(1)
    .map((childId) => hubs.find((hub) => hub.id === childId)?.label)
    .filter((label): label is string => label !== undefined);

  const kept =
    entryCount === 0
      ? 'Nothing is deleted.'
      : entryCount === 1
        ? 'The 1 thing you logged there is kept, not deleted.'
        : `The ${entryCount} things you logged there are kept, not deleted.`;

  const alsoGoes =
    children.length === 0
      ? ''
      : ` ${children.join(' and ')} ${children.length === 1 ? 'goes' : 'go'} with it — ${
          children.length === 1 ? 'it is' : 'they are'
        } only reachable through this hub.`;

  return `${kept} You can bring it back whenever you like.${alsoGoes}`;
}

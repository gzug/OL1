/**
 * Making a hub.
 *
 * The owner's brief was "similar to creating a project in Claude or ChatGPT" — a few plain questions
 * rather than a form. That shape is why this file exists at all: the questions and their validation
 * are here, apart from the screen, so the rules can be tested without rendering anything.
 *
 * Creating an exercise type inside Activity is the SAME act with a parent set. Modelling it as
 * anything else would mean writing and maintaining the flow twice, which is exactly what
 * `parentId` in the catalog was for.
 *
 * Nothing here persists. Hubs live in `catalog.ts` as seed data, and a real store is behind
 * `src/application/` where a screen may not reach — so the flow collects answers, shows what it
 * would make, and says plainly that it is not wired up. A flow that silently discarded a hub the
 * user just named would be worse than one that admits it.
 */

import { SEED_HUBS, type HubDefinition, type HubId } from './catalog';

/** Route ids that are already taken by a screen, so a hub may never claim them. */
const RESERVED_IDS: readonly string[] = ['bootstrap', 'hub', 'index', 'new-hub', 'table', 'twin'];

export const NAME_MAX = 24;
export const FOCUS_MAX = 80;

export type NewHubDraft = {
  /** One line: what this hub's coach is responsible for. Becomes the coach's focus. */
  readonly focus: string;
  readonly name: string;
  /** Set when the hub is being made inside another — Activity's exercise types. */
  readonly parentId?: HubId;
};

/**
 * A hub's id, derived from its name rather than asked for. Asking a non-developer to invent a
 * URL-safe identifier is asking them to do the computer's job badly.
 */
export function draftId(name: string): HubId {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type DraftProblem = 'empty' | 'focusTooLong' | 'nameTooLong' | 'reserved' | 'taken';

/**
 * What is wrong with a draft, or null. Returns the FIRST problem rather than a list: this is a
 * three-question flow on a phone, and a wall of validation on a three-word answer reads as failure.
 */
export function draftProblem(
  draft: NewHubDraft,
  hubs: readonly HubDefinition[] = SEED_HUBS,
): DraftProblem | null {
  const id = draftId(draft.name);

  if (id.length === 0) return 'empty';
  if (draft.name.trim().length > NAME_MAX) return 'nameTooLong';
  if (draft.focus.trim().length > FOCUS_MAX) return 'focusTooLong';
  if (RESERVED_IDS.includes(id)) return 'reserved';
  if (hubs.some((hub) => hub.id === id)) return 'taken';

  return null;
}

export function problemMessage(problem: DraftProblem): string {
  switch (problem) {
    case 'empty':
      return 'Give it a name with a letter or a number in it.';
    case 'focusTooLong':
      return `Keep the focus under ${FOCUS_MAX} characters — one line, not a paragraph.`;
    case 'nameTooLong':
      return `Names fit in a circle on the orbit, so keep it under ${NAME_MAX} characters.`;
    case 'reserved':
      return 'That name is already used by a screen. Pick another.';
    case 'taken':
      return 'A hub with that name already exists.';
  }
}

/**
 * What the draft would become. The coach id matches the hub id: a hub the user makes gets its own
 * coach rather than borrowing one, because a hub answered by another hub's coach is the confusion
 * `coachForHub` returning undefined was written to avoid.
 */
export function draftPreview(draft: NewHubDraft): {
  coachName: string;
  hub: HubDefinition;
  where: string;
} {
  const id = draftId(draft.name);
  const name = draft.name.trim();

  return {
    coachName: `${name} Coach`,
    hub: {
      coachId: id,
      id,
      label: name,
      origin: 'user',
      ...(draft.parentId === undefined ? {} : { parentId: draft.parentId }),
    },
    where:
      draft.parentId === undefined
        ? 'It joins the orbit on Home.'
        : `It lives inside ${draft.parentId}, not on the orbit.`,
  };
}

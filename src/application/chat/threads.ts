/**
 * Which conversation a coach selection belongs to, and how many coaches may be in one.
 *
 * Pure on purpose: the thread id decides whether sending resumes a conversation or starts a new one,
 * and that is worth asserting without a database in the room.
 */

/**
 * Five coaches to a table. The owner's number, 2026-08-03.
 *
 * It is a product limit, not a technical one — each coach in a round table is a voice in one answer,
 * and past about five the answer stops being a conversation and becomes a list. Activity's coaches
 * per sport do not change this: they are coaches like any other and count toward the five.
 */
export const MAX_COACHES_PER_CONVERSATION = 5;

/** Empty is the general assistant: no coach, ask anything. */
export const GENERAL_THREAD_ID = 'chat_general';

/**
 * The id of the thread a selection resumes.
 *
 * Sorted, so picking Sleep then Activity lands in the same conversation as Activity then Sleep.
 * Ported from Legacy `screens/coach/RoundTableFlow.tsx`, whose `round_table_<sorted slot ids>_main`
 * exists for exactly that reason — without the sort, re-picking the same two coaches in the other
 * order opened an empty thread and the previous one looked lost.
 */
export function threadIdFor(coachIds: readonly string[]): string {
  const unique = [...new Set(coachIds)].sort();
  return unique.length === 0 ? GENERAL_THREAD_ID : `chat_${unique.join('_')}`;
}

/**
 * Include or exclude a coach. Returns the same array when the cap refuses the addition, so the
 * caller can tell "nothing changed" from "changed" by identity and say so on screen — a tap that
 * silently does nothing is the worst of the three possible behaviours.
 */
export function toggleCoach(
  selected: readonly string[],
  coachId: string,
): readonly string[] {
  if (selected.includes(coachId)) {
    return selected.filter((id) => id !== coachId);
  }
  if (selected.length >= MAX_COACHES_PER_CONVERSATION) {
    return selected;
  }
  return [...selected, coachId];
}

/** What the selector chip says. Names them while they fit, counts them once they do not. */
export function selectionLabel(names: readonly string[]): string {
  if (names.length === 0) return 'Ask anything';
  if (names.length <= 2) return names.join(', ');
  return `${names.length} coaches`;
}

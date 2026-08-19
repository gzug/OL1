/**
 * Which conversation is which, and how many coaches may be in one.
 *
 * Pure on purpose: what decides whether sending resumes a conversation or starts a new one is worth
 * asserting without a database in the room.
 *
 * **A conversation has its own identity as of 2026-08-19.** It used to be derived from the coaches
 * in it — `threadIdFor(['sleep'])` was always `chat_sleep` — which meant the Sleep coach had exactly
 * ONE conversation, for ever, growing without end. The owner asked for the opposite, in his words:
 * *"you can always jump back into previous chats with the coaches... it should always show you the
 * last three conversations. Similar to how it is here in Claude."* Three separate conversations with
 * one coach is impossible while the coaches ARE the id, so the id had to stop being derived.
 *
 * Threads written under the old scheme keep their ids and become ordinary conversations. Nothing is
 * migrated and nothing is lost: `latestFor` finds them by their coaches like any other.
 */

/**
 * Five coaches to a table. The owner's number, 2026-08-03.
 *
 * It is a product limit, not a technical one — each coach in a round table is a voice in one answer,
 * and past about five the answer stops being a conversation and becomes a list. Activity's coaches
 * per sport do not change this: they are coaches like any other and count toward the five.
 */
export const MAX_COACHES_PER_CONVERSATION = 5;

/** The id the general assistant's conversation had while ids were derived. Still a valid thread. */
export const GENERAL_THREAD_ID = 'chat_general';

/** A new conversation's id. The same shape a turn id uses, and unique for the same reasons. */
export function newThreadId(): string {
  return `chat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The coaches of a conversation, in the one order two selections of the same coaches both produce.
 *
 * Sorted, so Sleep-then-Exercise and Exercise-then-Sleep are recognised as the same table. Ported
 * from Legacy `screens/coach/RoundTableFlow.tsx`, whose `round_table_<sorted slot ids>_main` exists
 * for exactly that reason — without the sort, re-picking the same two coaches in the other order
 * looked like a different conversation and the previous one looked lost.
 */
export function tableKey(coachIds: readonly string[]): string {
  return [...new Set(coachIds)].sort().join(',');
}

/** Just enough of a thread to choose between them. `ChatThread` and its summary both satisfy it. */
export type ThreadLike = {
  readonly coachIds: readonly string[];
  readonly id: string;
  readonly updatedAt: string;
};

/**
 * The conversation a table continues when nothing names one: the most recent with exactly these
 * coaches, or none.
 *
 * "Exactly" is the important word. A conversation with Sleep and Exercise is not the Sleep coach's
 * conversation — opening it because Sleep was asked for would drop someone else's coach into a
 * conversation the person thought was one-to-one.
 */
export function latestFor(
  threads: readonly ThreadLike[],
  coachIds: readonly string[],
): ThreadLike | undefined {
  const key = tableKey(coachIds);
  return [...threads]
    .filter((thread) => tableKey(thread.coachIds) === key)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

/**
 * The most recent conversations a coach was part of — the hub's "last three".
 *
 * Unlike `latestFor` this is deliberately loose: a conversation where the Sleep coach sat with two
 * others still counts as one you had with Sleep, because from the hub's side it is. The two
 * different rules are the whole reason they are separate functions rather than one with a flag.
 */
export function recentFor<T extends ThreadLike>(
  threads: readonly T[],
  coachId: string,
  limit = 3,
): readonly T[] {
  return [...threads]
    .filter((thread) => thread.coachIds.includes(coachId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
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

/**
 * What the selector chip says.
 *
 * One name, or a count. Two names were tried first and did not survive the rendered screen:
 * "Activity Coach, Sleep Coach" is 27 characters in a chip that fits about 16, so it truncated to
 * "Activity Coach, Sl…" — which reads as a layout fault rather than as a selection.
 */
export function selectionLabel(names: readonly string[]): string {
  if (names.length === 0) return 'Ask anything';
  if (names.length === 1) return names[0];
  return `${names.length} coaches`;
}

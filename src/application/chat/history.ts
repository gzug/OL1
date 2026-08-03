/**
 * How an earlier conversation is named and ordered in the history list.
 *
 * Pure, because "which conversation is this" is the only thing the list has to get right, and
 * getting it wrong means someone reopens the wrong thread.
 */

import type { ChatThreadSummary, CoachDescriptor } from '@/core/chat';

/** Longer than this and the line wraps in the sheet, which turns a list into a wall. */
const PREVIEW_MAX = 64;

export type HistoryEntry = {
  readonly coachIds: readonly string[];
  readonly id: string;
  /** The first question asked, shortened. Empty when the thread has none. */
  readonly preview: string;
  /** Who was at the table, or "Assistant" when nobody was. */
  readonly title: string;
  readonly updatedAt: string;
};

/**
 * The name of a thread: its coaches, or "Assistant".
 *
 * Names rather than a count, unlike the bar's chip — the chip is a fixed-width control and this is a
 * full-width row, so the thing that forced "2 coaches" there does not apply here.
 */
export function threadTitle(
  coachIds: readonly string[],
  coaches: readonly CoachDescriptor[],
): string {
  const named = coachIds
    .map((id) => coaches.find((coach) => coach.id === id)?.name)
    .filter((name): name is string => name !== undefined);

  return named.length === 0 ? 'Assistant' : named.join(', ');
}

/** One line of the first question, with the ellipsis only where something was actually cut. */
export function shortPreview(text: string, max = PREVIEW_MAX): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The history list.
 *
 * Threads with nothing in them are dropped. They exist: `persist` creates a thread and appends in
 * two steps, so a crash between them leaves a named row with no question in it, and a history entry
 * that opens an empty conversation is worse than one that is not offered.
 *
 * Ordering is the store's — newest activity first — and is not re-sorted here, because the store is
 * the only thing that knows when a turn actually landed.
 */
export function historyEntries(
  threads: readonly ChatThreadSummary[],
  coaches: readonly CoachDescriptor[],
): readonly HistoryEntry[] {
  return threads
    .filter((thread) => thread.preview.trim().length > 0)
    .map((thread) => ({
      coachIds: thread.coachIds,
      id: thread.id,
      preview: shortPreview(thread.preview),
      title: threadTitle(thread.coachIds, coaches),
      updatedAt: thread.updatedAt,
    }));
}

/**
 * Everything you have recorded, across every hub, newest first.
 *
 * The Twin's ledger was a four-row fixture reading "Lab report added · 12 Mar" under a footer
 * saying "Showing 4 of 148". This is the real one: a person's own entries, from wherever they were
 * logged, in the order they happened.
 *
 * **It belongs on the Twin rather than in a hub**, because a hub already shows its own entries and
 * the question this answers is a different one — not "what have I logged about sleep" but "what
 * have I told this app at all". The Twin is the only screen that is about the whole person.
 *
 * Pure, so the merging and the ordering can be asserted in bare Node. Reading the hubs is the
 * component's job.
 */

import type { HubEntry } from '@/core/hubs';

export type LedgerLine = {
  /** ISO, straight off the entry. Formatting is the screen's business. */
  readonly at: string;
  readonly hubLabel: string;
  readonly id: string;
  readonly kind: string;
  readonly source: string;
};

/**
 * Merge, order and cap.
 *
 * **Ordered by `recordedAt` — when the thing HAPPENED — not by when the row was written.** A meal
 * logged at midnight for lunch belongs at lunchtime, and a panel from March entered this afternoon
 * does not belong at the top of a ledger. That distinction is written into the schema, and this is
 * the third place it earns its keep.
 *
 * Ties break on `id` so the order is stable. Two entries can share a timestamp — a panel and the
 * weigh-in taken with it — and a list that reshuffles on every read looks broken.
 */
export function ledgerLines(
  entries: readonly (HubEntry & { hubLabel: string })[],
  limit: number,
): readonly LedgerLine[] {
  return [...entries]
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((entry) => ({
      at: entry.recordedAt,
      hubLabel: entry.hubLabel,
      id: entry.id,
      kind: entry.kind,
      source: entry.source,
    }));
}

/**
 * "Showing 5 of 23", or nothing when there is nothing being hidden.
 *
 * The fixture said "Showing 4 of 148" with 148 invented. A footer that names a total has to be able
 * to stand behind it, and one that appears when nothing is hidden is just noise.
 */
export function ledgerFooter(total: number, shown: number): string | null {
  return total > shown ? `Showing ${shown} of ${total}` : null;
}

/**
 * How a stored entry is written down, in the words a person would use.
 *
 * Lifted out of `StoredEntries.tsx` when the Twin's ledger needed the same vocabulary. Two copies
 * of "meal / meals" is how one screen comes to call something a `weight` and another a weigh-in —
 * and inside a `.tsx` none of it could be asserted in bare Node.
 *
 * **An unknown kind still renders, by its own name.** A hub the user invented holds entries nobody
 * here wrote a word for, and the alternative to a plain fallback is a screen that silently drops
 * what somebody logged.
 */

const KINDS: Readonly<Record<string, { one: string; many: string }>> = {
  meal: { many: 'meals', one: 'meal' },
  panel: { many: 'panels', one: 'panel' },
  session: { many: 'sessions', one: 'session' },
  weight: { many: 'weigh-ins', one: 'weigh-in' },
  /** A muscle tapped on the body figure. Not a session — see `muscleLoad`'s note on hand-marking. */
  worked: { many: 'muscles marked', one: 'muscle marked' },
};

/** How it got here. Shown, never guessed at. */
const SOURCES: Readonly<Record<string, string>> = {
  camera: 'photographed',
  chat: 'from a conversation',
  described: 'described',
  file: 'from a file',
  library: 'from a photo',
  manual: 'entered by hand',
  photo: 'photographed',
};

export function kindWords(kind: string, count: number): string {
  const words = KINDS[kind] ?? { many: `${kind} entries`, one: `${kind} entry` };
  return count === 1 ? words.one : words.many;
}

export function sourceWords(source: string): string {
  return SOURCES[source] ?? source;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The date, as a person writes it. No time — an entry's hour is not the reading.
 *
 * UTC throughout, which is a real trade rather than an oversight: a meal logged at 23:00 local can
 * show the following day. The alternative is a date that changes as somebody travels, and a stored
 * `recordedAt` that renders differently in two places is worse than one that is consistently a few
 * hours coarse. Revisit when there is a device timezone to trust.
 */
export function day(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'undated';
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

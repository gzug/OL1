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
  /**
   * `goal` and `note` arrive from the first-run flow, which was built in a parallel session while
   * this vocabulary was being written in another. Without words they fell through to the plain
   * fallback and the Twin's ledger read "Goal entry · Labs" and "Note entry · Gym" — understandable,
   * and nothing a person would ever write.
   *
   * Worth keeping as a note about the fallback rather than only about these two: it is doing its job
   * when an unknown kind still renders, and it is also the signal that a kind has become real enough
   * to deserve a word.
   */
  goal: { many: 'goals', one: 'goal' },
  meal: { many: 'meals', one: 'meal' },
  note: { many: 'notes', one: 'note' },
  panel: { many: 'panels', one: 'panel' },
  session: { many: 'sessions', one: 'session' },
  /** A sport somebody named in the first run. It gives them a coach, not a hub. */
  sport: { many: 'sports named', one: 'sport named' },
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

/**
 * Whether an entry is a thing somebody HAS, rather than a question they answered "no" to.
 *
 * A goal turned off is still written down — nothing in OL1 deletes, so declining is recorded rather
 * than erased. But it is not something a person has, and counting it as one is how the Sleep hub
 * came to say **"1 goal"** to somebody who had just turned their only goal off.
 *
 * That is the same defect as "4 goals" one layer up: the rows converged, and the count still spoke
 * for a person who had said no.
 */
export function isHeld(entry: { payload: Readonly<Record<string, unknown>> }): boolean {
  return entry.payload.held !== false;
}

export function kindWords(kind: string, count: number): string {
  const words = KINDS[kind] ?? { many: `${kind} entries`, one: `${kind} entry` };
  return count === 1 ? words.one : words.many;
}

export function sourceWords(source: string): string {
  return SOURCES[source] ?? source;
}

/**
 * The id an ANSWER is written under, so writing it again replaces it.
 *
 * An event keeps a fresh id and accumulates; an answer keeps this one and converges. Toggling
 * "Sleep better" four times is one answer changed three times, not four goals — and it read as
 * "4 goals" on the Sleep hub until this existed.
 *
 * **Both screens that write an answer must use this**, or the first run and the settings screen
 * produce two rows for one answer and each believes it wrote the only copy.
 */
export function answerId(kind: string, hubId: string, label: string): string {
  return `answer:${kind}:${hubId}:${label.trim().toLowerCase()}`;
}

/**
 * The id a MEASUREMENT taken on a given day is written under.
 *
 * A weigh-in really is an event — it has a date, and two of them a week apart are two readings. But
 * two on the SAME day, from walking the first run twice, are one reading recorded twice. Keyed by
 * day, re-answering replaces and next week's is genuinely new.
 *
 * Found by walking the first run twice on the deployed preview: the goals and the sports converged
 * and the weigh-in did not, so Nutrition read "2 weigh-ins" for one weight given once.
 */
export function dailyId(kind: string, hubId: string, isoDate: string): string {
  return `daily:${kind}:${hubId}:${isoDate.slice(0, 10)}`;
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

/**
 * What a week of logged entries actually supports saying.
 *
 * Pure, so every claim below can be asserted without a store. This is the file that decides whether
 * a cockpit is allowed to use the words "this week", and the rule is Legacy's own.
 *
 * **PORTED RULE — `nutritionHomeBlock.ts`:** *"A sentence containing the words 'this week' needs a
 * week under it."* Legacy released its weekly score at three logged meals, and three meals can all
 * sit on one day. `docs/decisions/0005-the-hub-model.md` already cites this; here it becomes code.
 *
 * The consequence is the point: a hub with two days of entries says what it has, and does not
 * average it into a weekly claim. Refusing to speak is a designed state, not a gap.
 */

export type Entryish = {
  readonly kind: string;
  readonly recordedAt: string;
};

/** The window every "this week" claim is measured over. */
export const WEEK_DAYS = 7;

/**
 * How many separate days a weekly claim needs under it.
 *
 * Legacy's number, and its reasoning: fewer than this and one enthusiastic Tuesday becomes "your
 * week". Four of seven is not a high bar, and it is a bar.
 */
export const MIN_DAYS_FOR_A_WEEKLY_CLAIM = 4;

function localDay(iso: string): string {
  return iso.slice(0, 10);
}

function withinDays(iso: string, now: string, days: number): boolean {
  const ms = new Date(now).getTime() - new Date(iso).getTime();
  return Number.isFinite(ms) && ms >= 0 && ms < days * 86_400_000;
}

/**
 * The entries of one kind that are inside the window — **the one definition of "this week"**.
 *
 * It exists because three components on the Nutrition screen each answered that question their own
 * way and printed three different numbers for the same meals: "5 meals", "5 meals logged on 3 days"
 * and "From 6 meals across 4 days". One of them capped its read at five and counted the cap; another
 * had no window at all and was scoring a meal dated an hour into the future.
 *
 * A screen that cannot agree with itself about how many meals there were is worse than a screen
 * that shows nothing, so there is now one function and everything that says "this week" calls it.
 */
export function entriesThisWeek<T extends Entryish>(
  entries: readonly T[],
  kind: string,
  now: string,
): readonly T[] {
  return entries.filter(
    (entry) => entry.kind === kind && withinDays(entry.recordedAt, now, WEEK_DAYS),
  );
}

export type WeekOfEntries = {
  /** Distinct days with at least one entry. The number the weekly claim is gated on. */
  readonly days: number;
  /** Entries today, by the same local-day reckoning the strip uses. */
  readonly today: number;
  /** Entries in the window. */
  readonly total: number;
  /** Whether "this week" may be said at all. */
  readonly weeklyClaimAllowed: boolean;
};

export function weekOfEntries(
  entries: readonly Entryish[],
  kind: string,
  now: string,
): WeekOfEntries {
  const inWindow = entriesThisWeek(entries, kind, now);

  const days = new Set(inWindow.map((entry) => localDay(entry.recordedAt)));
  const today = inWindow.filter((entry) => localDay(entry.recordedAt) === localDay(now)).length;

  return {
    days: days.size,
    today,
    total: inWindow.length,
    weeklyClaimAllowed: days.size >= MIN_DAYS_FOR_A_WEEKLY_CLAIM,
  };
}

/**
 * The seven day-keys the window covers, oldest first, ending on today.
 *
 * **One bucketing, not two.** The strip drew its own buckets and anything else counting days would
 * have drawn its own again — and a cockpit row naming a quiet Wednesday while the bar above it
 * shows a Wednesday with something on it is the failure this repository keeps finding. Everything
 * that divides the window into days now divides it here.
 *
 * UTC days, the same `slice(0, 10)` reckoning every other date in this app uses.
 */
export function weekDayKeys(now: string): readonly string[] {
  const end = new Date(now).getTime();
  return Array.from({ length: WEEK_DAYS }, (_, index) =>
    new Date(end - (WEEK_DAYS - 1 - index) * 86_400_000).toISOString().slice(0, 10),
  );
}

/**
 * The seven-day strip, oldest first, as a fraction of the busiest day.
 *
 * Relative to the busiest day rather than to a target, for the same reason the body figure's scale
 * is relative: there is no target here, and inventing one to divide by would be inventing the
 * reading. A day with nothing is 0, and `HubScreen`'s caption is what says whether a 0 means "rest"
 * or "not logged" — the strip itself never claims to know.
 */
export function weekStrip(
  entries: readonly Entryish[],
  kind: string,
  now: string,
): readonly { fill: number; label: string }[] {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  /**
   * Drawn from the same entries the count is made of.
   *
   * This filtered on kind and date alone, which made it a THIRD definition of "this week" — and it
   * drew a bar for a meal dated an hour into the future, so the strip showed four days above a
   * sentence saying three. Its own test caught it.
   */
  const week = entriesThisWeek(entries, kind, now);

  const counts = weekDayKeys(now).map((key) => ({
    count: week.filter((entry) => localDay(entry.recordedAt) === key).length,
    label: letters[new Date(`${key}T00:00:00.000Z`).getUTCDay()] ?? '·',
  }));

  const peak = Math.max(...counts.map((day) => day.count), 0);
  return counts.map((day) => ({
    fill: peak === 0 ? 0 : day.count / peak,
    label: day.label,
  }));
}

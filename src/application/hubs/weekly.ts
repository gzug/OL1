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
  const inWindow = entries.filter(
    (entry) => entry.kind === kind && withinDays(entry.recordedAt, now, WEEK_DAYS),
  );

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
  const end = new Date(now).getTime();

  const counts = Array.from({ length: WEEK_DAYS }, (_, index) => {
    const dayStart = new Date(end - (WEEK_DAYS - 1 - index) * 86_400_000);
    const key = dayStart.toISOString().slice(0, 10);
    return {
      count: entries.filter(
        (entry) => entry.kind === kind && localDay(entry.recordedAt) === key,
      ).length,
      label: letters[dayStart.getUTCDay()] ?? '·',
    };
  });

  const peak = Math.max(...counts.map((day) => day.count), 0);
  return counts.map((day) => ({
    fill: peak === 0 ? 0 : day.count / peak,
    label: day.label,
  }));
}

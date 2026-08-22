import { entriesThisWeek, weekDayKeys } from '@/application/hubs/weekly';
import type { HubEntry } from '@/core/hubs';
import { dayWords } from '@/ui/hubs/entryWords';
import type { CockpitPeriod } from '@/ui/hubs/hubState';
import { dayWordLabel } from '@/ui/resilience/day';

/**
 * The days you have described, counted and never averaged.
 *
 * **Every operation here is a tally.** Counting how many times a word was chosen is arithmetic on
 * days, not on feelings; averaging the five into a number would be arithmetic on feelings, and it
 * would rebuild the 0–100 recovery score the owner dropped on 2026-08-19. `docs/decisions/0017`.
 *
 * The consequence worth stating: **there is no "your week was a 6.2 out of 10" here and there
 * cannot be**, because nothing in the stored data is a number to begin with.
 */

type Day = { readonly day: string; readonly label: string };

function dayOf(entry: HubEntry): Day | null {
  if (entry.kind !== 'day') return null;
  const word = entry.payload.word;
  const label = typeof word === 'string' ? dayWordLabel(word) : null;
  /* A word this app does not offer is not a word this app can report. */
  return label === null ? null : { day: entry.recordedAt.slice(0, 10), label };
}

/**
 * The word chosen most, or the honest admission that there is no such word.
 *
 * A tie has no single answer and saying one anyway would pick a winner alphabetically or by
 * whichever the sort happened to leave first. `'even'` is what that case is called, and the screen
 * says it in words.
 */
export function mostOften(
  days: readonly Day[],
): { readonly count: number; readonly label: string } | 'even' | null {
  if (days.length === 0) return null;

  const tally = new Map<string, number>();
  for (const day of days) tally.set(day.label, (tally.get(day.label) ?? 0) + 1);

  const counts = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const top = counts[0];
  if (top === undefined) return null;
  if (counts.filter(([, count]) => count === top[1]).length > 1) return 'even';

  return { count: top[1], label: top[0] };
}

export function resiliencePeriods(
  entries: readonly HubEntry[],
  now: string,
): readonly CockpitPeriod[] {
  const all = entries
    .map(dayOf)
    .filter((day): day is Day => day !== null)
    .sort((a, b) => b.day.localeCompare(a.day));

  const last = all[0];
  if (last === undefined) return [];

  const week = entriesThisWeek(entries, 'day', now)
    .map(dayOf)
    .filter((day): day is Day => day !== null);

  const rows = [
    { label: 'Last answer', value: last.label, when: dayWords(last.day, now) },
    {
      label: 'Days described',
      value: String(week.length),
      when: `of the last ${weekDayKeys(now).length}`,
    },
  ];

  const common = mostOften(week);
  if (common === 'even') {
    rows.push({
      label: 'Most often',
      value: 'No one word',
      when: 'no answer came up more than the rest',
    });
  } else if (common !== null) {
    rows.push({
      label: 'Most often',
      value: common.label,
      when: `${common.count} of the ${week.length} days you described`,
    });
  }

  return [{ label: 'How your days have felt', rows }];
}

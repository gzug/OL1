import { formatMeasured, formatValue } from '@/application/format/metric';
import { entriesThisWeek } from '@/application/hubs/weekly';
import type { HubEntry } from '@/core/hubs';
import { dayWords } from '@/ui/hubs/entryWords';
import type { CockpitPeriod } from '@/ui/hubs/hubState';
import { MACROS } from '@/ui/meals/nutrition';

/**
 * The grams you logged, given back to you.
 *
 * The third cockpit filled from real entries. A person types calories, protein, carbohydrate, fat
 * and fibre into every meal, and until now **the app never showed any of it back** — `WeekScore`
 * turns two of the five into a number out of a hundred and the other three are simply stored.
 *
 * **Averages per MEAL, not per day.** A daily average silently claims the day was fully logged, and
 * this app cannot know that: somebody who records lunch and nothing else would read a third of
 * their intake as all of it. A per-meal average is exactly what was typed divided by how many times
 * it was typed, and claims nothing about the meals that were not.
 *
 * Each macro is averaged over the meals that **recorded that macro**, not over every meal. The same
 * rule `score.ts` follows for the two it reads: a blank is absent, never a zero. The row says how
 * many it counted, so a macro logged twice out of nine cannot pass as the week.
 *
 * **No time of day anywhere.** The fixture had "First meal 09:40" and "Typical first meal 08:15";
 * `recordedAt` is stored and rendered in UTC — `entryWords.day` explains the trade and refuses to
 * print an hour for exactly this reason — so a clock time here would be wrong by the traveller's
 * offset and right-looking either way.
 */

const UNIT: Readonly<Record<string, string>> = Object.fromEntries(
  MACROS.map((macro) => [macro.key, macro.unit]),
);

function macrosOf(entry: HubEntry): Readonly<Record<string, unknown>> {
  const macros = entry.payload.macros;
  return typeof macros === 'object' && macros !== null
    ? (macros as Readonly<Record<string, unknown>>)
    : {};
}

/** Recorded means a usable positive number. `score.ts` draws the line in the same place. */
function recorded(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function nutritionPeriods(
  entries: readonly HubEntry[],
  now: string,
): readonly CockpitPeriod[] {
  const meals = entriesThisWeek(entries, 'meal', now);

  const rows = MACROS.map((macro) => {
    const values = meals
      .map((meal) => recorded(macrosOf(meal)[macro.key]))
      .filter((value): value is number => value !== null);

    if (values.length === 0) return null;

    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    return {
      label: macro.label,
      value: formatMeasured(mean, UNIT[macro.key] ?? '') ?? '—',
      when: `average of ${values.length} ${values.length === 1 ? 'meal' : 'meals'}`,
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  /* A heading over nothing is its own small false claim. No meals, or meals with no macros on
     them, produce no block rather than a block of dashes — and the weigh-ins are independent of
     both, because somebody can step on a scale in a week they never logged a meal. */
  return [
    ...(rows.length === 0 ? [] : [{ label: 'What you logged, per meal', rows }]),
    ...weightPeriod(entries, now),
  ];
}

/**
 * Weight, from the weigh-ins on file.
 *
 * **Weight lives in this hub**, since the Body hub was retired on 2026-08-19. The first run stores
 * one, and `dailyId` makes it converge to at most one a day — so the count is days weighed rather
 * than times the button was pressed.
 *
 * All time, not this week: a weigh-in from a fortnight ago is still your last weigh-in, the same
 * argument the Exercise cockpit makes about the last session.
 *
 * **No direction.** The fixture had one — "Flat", "too few readings to say more" — and calling a
 * trend needs a threshold this app does not have for weight. `docs/decisions/0015` is the same
 * refusal in the Labs hub: compute what is arithmetic, refuse what is a judgement.
 */
function weightPeriod(entries: readonly HubEntry[], now: string): readonly CockpitPeriod[] {
  const weighed = entries
    .filter((entry) => entry.kind === 'weight')
    .map((entry) => ({ day: entry.recordedAt.slice(0, 10), kg: recorded(entry.payload.kg) }))
    .filter((entry): entry is { day: string; kg: number } => entry.kg !== null)
    .sort((a, b) => b.day.localeCompare(a.day));

  const last = weighed[0];
  if (last === undefined) return [];

  const days = new Set(weighed.map((entry) => entry.day)).size;

  return [
    {
      label: 'Weight',
      rows: [
        {
          label: 'Last weigh-in',
          value: formatValue('weight', last.kg) ?? '—',
          when: dayWords(last.day, now),
        },
        {
          label: 'Weigh-ins',
          value: String(days),
          when: days === 1 ? 'the only one on file' : 'days weighed, at most one a day',
        },
      ],
    },
  ];
}

import { formatDuration } from '@/application/format/metric';
import { entriesThisWeek } from '@/application/hubs/weekly';
import type { HubEntry } from '@/core/hubs';
import { dayWords } from '@/ui/hubs/entryWords';
import type { CockpitPeriod } from '@/ui/hubs/hubState';

/**
 * A cockpit made of the nights you logged.
 *
 * The fourth filled from real entries. Its fixture claimed six of the last seven nights "recorded
 * by your watch" — there is no watch, and there will not be one until the phone lands.
 *
 * **Every duration goes through `formatDuration`.** The fixture wrote `7h 05m` and `8h 04m`, which
 * that function never produces; two of its four durations agreed with it by accident. Nothing here
 * writes a duration by hand.
 *
 * **No bed time, no wake time.** `night.ts` says why they are not asked for, and a cockpit cannot
 * report what nobody typed.
 */

/** Below this there is no typical night, only nights. */
export const MIN_NIGHTS_FOR_A_TYPICAL = 3;

type Night = { readonly day: string; readonly minutes: number };

function nightOf(entry: HubEntry): Night | null {
  if (entry.kind !== 'night') return null;
  const minutes = entry.payload.minutes;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return null;
  return { day: entry.recordedAt.slice(0, 10), minutes };
}

export function sleepPeriods(entries: readonly HubEntry[], now: string): readonly CockpitPeriod[] {
  const nights = entries
    .map(nightOf)
    .filter((night): night is Night => night !== null)
    .sort((a, b) => b.day.localeCompare(a.day));

  const last = nights[0];
  if (last === undefined) return [];

  const periods: CockpitPeriod[] = [
    {
      label: 'Last night logged',
      rows: [
        {
          label: 'Time asleep',
          value: formatDuration(last.minutes),
          when: dayWords(last.day, now),
        },
      ],
    },
  ];

  const week = entriesThisWeek(entries, 'night', now)
    .map(nightOf)
    .filter((night): night is Night => night !== null);

  /**
   * **Two nights is not a typical night.** One night against itself is not an average, and two is a
   * pair — the same discipline `WhatChanged` keeps about two panels, and `weekly.ts` about four
   * days before a week may be spoken of at all.
   */
  if (week.length < MIN_NIGHTS_FOR_A_TYPICAL) return periods;

  const total = week.reduce((sum, night) => sum + night.minutes, 0);
  const byLength = [...week].sort((a, b) => a.minutes - b.minutes);
  const shortest = byLength[0];
  const longest = byLength[byLength.length - 1];

  periods.push({
    label: 'Last seven nights',
    rows: [
      {
        label: 'Typical night',
        value: formatDuration(total / week.length),
        when: `across ${week.length} nights`,
      },
      ...(shortest === undefined
        ? []
        : [
            {
              label: 'Shortest',
              value: formatDuration(shortest.minutes),
              when: dayWords(shortest.day, now),
            },
          ]),
      ...(longest === undefined || longest.day === shortest?.day
        ? []
        : [
            {
              label: 'Longest',
              value: formatDuration(longest.minutes),
              when: dayWords(longest.day, now),
            },
          ]),
    ],
  });

  return periods;
}


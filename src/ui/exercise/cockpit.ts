import { entriesThisWeek, weekDayKeys } from '@/application/hubs/weekly';
import { formatDuration, formatMeasured } from '@/application/format/metric';
import type { HubEntry } from '@/core/hubs';
import { dayWords } from '@/ui/hubs/entryWords';
import { SESSION_TYPES } from '@/ui/exercise/session';
import type { CockpitPeriod } from '@/ui/hubs/hubState';

/**
 * A cockpit made of your own sessions.
 *
 * Every hub's cockpit has been a fixture since the shape was designed — invented rows under a
 * heading, below `SAMPLE_DATA_LINE`, so the layout could be judged before anything could fill it.
 * This is the first one filled, and it goes ABOVE the line with the rest of what is real.
 *
 * **It deliberately does not repeat what is already on the screen.** `LoggedWeek` prints the count
 * and draws the seven bars; `Heatmap` draws twelve weeks and the lifetime totals. What neither can
 * say is what the last session actually WAS, how long the week added up to, or which days have
 * nothing on them — so those are the rows, and the count is left where it already lives.
 *
 * **"Rest days" is not a thing this app can see.** The fixture called them that, on a screen whose
 * own caption says twice that an empty day means nothing was logged and not that nothing happened.
 * A day with no session is a day with no session; naming it rest claims to know what someone did
 * while the app was not looking. The row says what is true and the reader draws their own line.
 */

const LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  SESSION_TYPES.map((type) => [type.id, type.label]),
);

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Session = {
  readonly activity: string;
  readonly day: string;
  readonly distanceKm: number | null;
  readonly minutes: number;
};

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * A session the screen can stand behind, or nothing.
 *
 * Minutes are required: a row reading "Running — 0m" is worse than a row that is not there, and an
 * entry without them is a session somebody started saving and did not finish.
 */
function sessionOf(entry: HubEntry): Session | null {
  if (entry.kind !== 'session') return null;
  const minutes = number(entry.payload.minutes);
  if (minutes === null) return null;

  const activity = entry.payload.activity;
  return {
    activity: typeof activity === 'string' ? (LABEL[activity] ?? 'Session') : 'Session',
    day: entry.recordedAt.slice(0, 10),
    distanceKm: number(entry.payload.distanceKm),
    minutes,
  };
}

/** The days in the window with no session on them, named. Empty when every day has one. */
export function quietDays(entries: readonly HubEntry[], now: string): readonly string[] {
  const logged = new Set(
    entriesThisWeek(entries, 'session', now).map((entry) => entry.recordedAt.slice(0, 10)),
  );

  return weekDayKeys(now)
    .filter((key) => !logged.has(key))
    .map((key) => DAY_NAMES[new Date(`${key}T00:00:00.000Z`).getUTCDay()] ?? key);
}

export function exercisePeriods(
  entries: readonly HubEntry[],
  now: string,
): readonly CockpitPeriod[] {
  const sessions = entries.map(sessionOf).filter((session): session is Session => session !== null);
  if (sessions.length === 0) return [];

  const periods: CockpitPeriod[] = [];

  /* The newest session ever, not the newest this week. Somebody who has not trained in a fortnight
     still wants to see what the last one was — an empty block would read as no history at all. */
  const last = [...sessions].sort((a, b) => b.day.localeCompare(a.day))[0];
  if (last !== undefined) {
    const when = dayWords(last.day, now);
    periods.push({
      label: 'Last session',
      rows: [
        { label: last.activity, value: formatDuration(last.minutes), when },
        ...(last.distanceKm === null
          ? []
          : [
              {
                label: 'Distance',
                value: formatMeasured(last.distanceKm, 'km') ?? '—',
                when,
              },
            ]),
      ],
    });
  }

  /* The window itself, through the same reader — not the day keys of the window, which would let
     a session seven days and two hours old in through a day it happens to share. */
  const week = entriesThisWeek(entries, 'session', now)
    .map(sessionOf)
    .filter((session): session is Session => session !== null);

  if (week.length > 0) {
    const minutes = week.reduce((total, session) => total + session.minutes, 0);
    const longest = [...week].sort((a, b) => b.minutes - a.minutes)[0];
    const quiet = quietDays(entries, now);

    periods.push({
      label: 'Last seven days',
      rows: [
        {
          label: 'Time moving',
          value: formatDuration(minutes),
          when: `across ${week.length} ${week.length === 1 ? 'session' : 'sessions'}`,
        },
        ...(longest === undefined
          ? []
          : [
              {
                label: 'Longest',
                value: formatDuration(longest.minutes),
                when: `${longest.activity}, ${dayWords(longest.day, now)}`,
              },
            ]),
        {
          label: 'Days with nothing logged',
          value: quiet.length === 0 ? 'None' : String(quiet.length),
          when: quiet.length === 0 ? 'a session on all seven' : quiet.join(', '),
        },
      ],
    });
  }

  return periods;
}

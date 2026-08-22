import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * **Weight lives here now.** The Body hub was retired on 2026-08-19 — the owner named his hubs
 * twice without it — and its weigh-in rows moved into this cockpit rather than being deleted:
 * weight sits next to what you eat more naturally than it sits alone. Resting heart rate did NOT
 * come with them; that is recovery, and it belongs to Resilience, which already reads it.
 */
export const nutrition: HubState = {
  basis: 'From the meals and weigh-ins you have typed in. Nothing here is measured for you.',
  /**
   * **The sample cockpit is gone, because a real one exists.**
   *
   * `WeekScore` gives the score and `src/ui/meals/MealCockpit.tsx` gives the grams behind it, both
   * above the sample line. Two cockpits on one screen carrying different numbers for the same week
   * is the "screen that cannot agree with itself" `weekly.ts` was written to end, and this one was
   * already doing it — the invented block said nine meals across four days while the real strip
   * above it counted eight across six.
   *
   * The seven-bar strip went with it: `LoggedWeek` draws the real one.
   *
   * The rows that are NOT coming back are the clock times — "First meal 09:40", "Typical first meal
   * 08:15". `recordedAt` is stored and rendered in UTC, which `entryWords.day` explains and refuses
   * to print an hour for: a time here would be wrong by the traveller's offset and look right
   * either way. The weigh-in rows ARE real and came with it — the first run stores a weight in
   * this hub, and `dailyId` makes it at most one a day.
   */
  cockpit: {
    empty: 'Your own meals fill the cockpit above this line. There is no invented one left here.',
    periods: [],
  },
  contribute: {
    href: '/log-meal',
    note: 'Reading the photo is not built yet — the review step behind it is.',
    primary: 'Log a meal',
    secondary: 'Photo, camera roll, or described',
  },
  facets: [
    { detail: '9 logged across 4 of the last 7 days', label: 'Meals', state: 'reading' },
    { detail: 'Last lab report, 12 Mar', label: 'Micronutrients', state: 'reading' },
    { detail: 'Shared with Labs', label: 'Biomarkers', state: 'elsewhere' },
    { detail: '3 weigh-ins in the last 14 days', label: 'Weight', state: 'reading' },
    { detail: 'Not connected yet', label: 'Hydration', state: 'missing' },
    { detail: 'Not connected yet', label: 'Body composition', state: 'missing' },
  ],
};

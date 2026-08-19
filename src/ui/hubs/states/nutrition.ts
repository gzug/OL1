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
  basis: 'From 9 meals logged across 4 of the last 7 days, and 3 weigh-ins in the last 14.',
  cockpit: {
    periods: [
      {
        label: 'Today',
        rows: [
          { label: 'Meals logged', value: '2', when: 'last at 13:20' },
          { label: 'First meal', value: '09:40', when: 'later than usual' },
        ],
      },
      {
        label: 'This week',
        rows: [
          { label: 'Days logged', value: '4 of 7', when: 'Mon, Tue, Thu, Sun' },
          { label: 'Meals logged', value: '9', when: 'across those 4 days' },
          { label: 'Typical first meal', value: '08:15', when: 'across 4 days' },
        ],
      },
      {
        /* Body moved in here. Its own cadence came with it: weight is a slow signal and four days
           without a reading is normal for it, which is why it keeps a period of its own rather than
           being mixed into a week built out of meals. */
        label: 'Weight, last 14 days',
        rows: [
          { label: 'Last weigh-in', value: '2 days ago', when: 'entered by hand' },
          { label: 'Weigh-ins', value: '3', when: 'roughly one a week' },
          { label: 'Direction', value: 'Flat', when: 'too few readings to say more' },
        ],
      },
    ],
    week: {
      caption: 'Three days have nothing logged. The gaps are the reading, not a failure.',
      days: [
        { fill: 1, label: 'M' },
        { fill: 0.67, label: 'T' },
        { fill: 0, label: 'W' },
        { fill: 1, label: 'T' },
        { fill: 0, label: 'F' },
        { fill: 0, label: 'S' },
        { fill: 0.67, label: 'S' },
      ],
    },
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
  observation: 'Your later meals land on the days you train in the evening.',
};

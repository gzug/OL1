import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * An exercise type inside Activity, and the first of five. What these can honestly show is
 * constrained by a decision the owner already made: Health Connect over Legacy's owner-run Garmin
 * box. Legacy's `data/activity/activityHubData.ts` is explicit that a Health Connect exercise
 * session carries start, end, duration and a type code — and **not** distance, calories, a title or
 * heart rate — so those "stay null and the chips simply omit themselves, honest, never fabricated".
 *
 * Distance is not impossible, it is just not free: Health Connect stores it as a separate record
 * that has to be correlated by time. Until that is built it reads as elsewhere rather than as
 * something this hub knows, and pace is left out entirely because it is derived from a number we do
 * not have.
 */
export const running: HubState = {
  basis: 'From 3 sessions in the last 14 days.',
  cockpit: {
    periods: [
      {
        label: 'Last session',
        rows: [
          { label: 'Time moving', value: '48 min', when: 'yesterday evening' },
          { label: 'Started', value: '18:40', when: 'your usual window' },
        ],
      },
      {
        label: 'Last 14 days',
        rows: [
          { label: 'Sessions', value: '3', when: 'across 3 days' },
          { label: 'Time moving', value: '2h 14m', when: 'in total' },
          { label: 'Longest', value: '58 min', when: 'Sunday' },
        ],
      },
    ],
    week: {
      caption: 'Duration only — distance is not in this hub yet, so nothing here implies pace.',
      days: [
        { fill: 0, label: 'M' },
        { fill: 0.62, label: 'T' },
        { fill: 0, label: 'W' },
        { fill: 0.81, label: 'T' },
        { fill: 0, label: 'F' },
        { fill: 0, label: 'S' },
        { fill: 1, label: 'S' },
      ],
    },
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Log a run',
    secondary: 'Connect Strava or Garmin',
  },
  facets: [
    { detail: '3 in the last 14 days', label: 'Sessions', state: 'reading' },
    { detail: 'From the session record', label: 'Time moving', state: 'reading' },
    { detail: 'A separate record — not connected', label: 'Distance', state: 'elsewhere' },
    { detail: 'Not in Health Connect sessions', label: 'Heart rate', state: 'missing' },
    { detail: 'Needs Strava or a GPX file', label: 'Routes', state: 'missing' },
  ],
  observation: 'Your runs cluster at the end of the week.',
};

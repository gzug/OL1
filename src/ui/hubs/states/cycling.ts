import type { HubState } from '../hubState';

/** FIXTURE — invented for layout review. See the headers of `../hubState.ts` and `./running.ts`. */
export const cycling: HubState = {
  basis: 'From 2 rides in the last 14 days.',
  cockpit: {
    periods: [
      {
        label: 'Last ride',
        rows: [
          { label: 'Time riding', value: '1h 34m', when: 'Saturday' },
          { label: 'Started', value: '09:20', when: 'weekend pattern' },
        ],
      },
      {
        label: 'Last 14 days',
        rows: [
          { label: 'Rides', value: '2', when: 'both at weekends' },
          { label: 'Time riding', value: '2h 51m', when: 'in total' },
        ],
      },
    ],
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Log a ride',
    secondary: 'Connect Strava or Garmin',
  },
  facets: [
    { detail: '2 in the last 14 days', label: 'Rides', state: 'reading' },
    { detail: 'From the session record', label: 'Time riding', state: 'reading' },
    { detail: 'A separate record — not connected', label: 'Distance', state: 'elsewhere' },
    { detail: 'Needs Strava or a GPX file', label: 'Routes', state: 'missing' },
  ],
  observation: 'Both rides this fortnight fell on a weekend.',
};

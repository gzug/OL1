import type { HubState } from '../hubState';

/** FIXTURE — invented for layout review. See the header of `../hubState.ts`. */
export const activity: HubState = {
  basis: 'From 5 sessions in the last 7 days, across running and the gym.',
  cockpit: {
    periods: [
      {
        label: 'Last session',
        rows: [
          { label: 'Running', value: '48 min', when: 'yesterday evening' },
          { label: 'Distance', value: '8.2 km', when: 'yesterday evening' },
        ],
      },
      {
        label: 'This week',
        rows: [
          { label: 'Sessions', value: '5', when: 'across 4 days' },
          { label: 'Time moving', value: '3h 40m', when: 'this week' },
          { label: 'Rest days', value: '3', when: 'Wed, Fri, Sun' },
        ],
      },
    ],
    week: {
      caption: 'Two sessions landed on the same day. Wednesday and Friday were rest.',
      days: [
        { fill: 0.55, label: 'M' },
        { fill: 0.88, label: 'T' },
        { fill: 0, label: 'W' },
        { fill: 1, label: 'T' },
        { fill: 0, label: 'F' },
        { fill: 0.62, label: 'S' },
        { fill: 0, label: 'S' },
      ],
    },
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Log a session by hand',
    secondary: 'Connect Strava or Garmin',
  },
  facets: [
    { detail: '5 sessions in the last 7 days', label: 'Sessions', state: 'reading' },
    { detail: 'Running and gym, 5 sessions', label: 'Exercise types', state: 'reading' },
    { detail: 'Shared with Sleep', label: 'Recovery', state: 'elsewhere' },
    { detail: 'Not connected yet', label: 'Routes', state: 'missing' },
  ],
  observation: 'Your evening sessions cluster in the second half of the week.',
};

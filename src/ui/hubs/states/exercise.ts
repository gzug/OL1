import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * This hub was called Activity until 2026-08-19, when the owner re-drew the ring and named it
 * **Exercise**. Running and Gym stay inside it — he considered putting them on the ring beside it
 * and decided against it, so this hub remains the honest total of everything you move rather than
 * a leftover holding whatever the named sports do not cover.
 */
export const exercise: HubState = {
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
    /**
     * Two real ways in. Strava is an IMPORT rather than a connection — a file you request from
     * their website and this reads on your device — so it sits beside the by-hand button rather
     * than replacing it. Connecting a watch live still waits for the phone, which the note says.
     */
    also: { href: '/from-strava', label: 'Bring your history in from Strava' },
    href: '/log-session',
    note: 'Connecting a watch live waits for the phone. The Strava import needs no connection.',
    primary: 'Log a session by hand',
    secondary: 'What, how long, and how far if you measured it',
  },
  facets: [
    { detail: '5 sessions in the last 7 days', label: 'Sessions', state: 'reading' },
    { detail: 'Running and gym, 5 sessions', label: 'Exercise types', state: 'reading' },
    { detail: 'Shared with Sleep', label: 'Recovery', state: 'elsewhere' },
    { detail: 'Not connected yet', label: 'Routes', state: 'missing' },
  ],
  observation: 'Your evening sessions cluster in the second half of the week.',
};

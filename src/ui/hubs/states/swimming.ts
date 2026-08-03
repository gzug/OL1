import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the headers of `../hubState.ts` and `./running.ts`.
 *
 * No week strip, for the same reason Labs has none: one swim a fortnight makes seven bars that are
 * empty six times out of seven, which reads as a failing rather than as a cadence. The rhythm this
 * hub actually has is measured in weeks, so the period rows say it and nothing draws it.
 */
export const swimming: HubState = {
  basis: 'From 1 swim in the last 14 days.',
  cockpit: {
    periods: [
      {
        label: 'Last swim',
        rows: [
          { label: 'Time in the water', value: '38 min', when: '9 days ago' },
        ],
      },
      {
        label: 'Since the start of the year',
        rows: [
          { label: 'Swims', value: '11', when: 'roughly one a fortnight' },
          { label: 'Longest gap', value: '6 weeks', when: 'over the winter' },
        ],
      },
    ],
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Log a swim',
    secondary: 'Connect a watch that records swims',
  },
  facets: [
    { detail: '11 since January', label: 'Swims', state: 'reading' },
    { detail: 'From the session record', label: 'Time in the water', state: 'reading' },
    { detail: 'Not in Health Connect sessions', label: 'Lengths and stroke', state: 'missing' },
    { detail: 'A separate record — not connected', label: 'Distance', state: 'elsewhere' },
  ],
};

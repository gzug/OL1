import type { HubState } from '../hubState';

/** FIXTURE — invented for layout review. See the header of `../hubState.ts`. */
export const body: HubState = {
  basis: 'From 3 weigh-ins in the last 14 days.',
  cockpit: {
    periods: [
      {
        label: 'Last reading',
        rows: [
          { label: 'Weigh-in', value: '2 days ago', when: 'entered by hand' },
          { label: 'Resting heart rate', value: '54', when: 'yesterday, from your watch' },
        ],
      },
      {
        label: 'Last 14 days',
        rows: [
          { label: 'Weigh-ins', value: '3', when: 'roughly one a week' },
          { label: 'Direction', value: 'Flat', when: 'too few readings to say more' },
        ],
      },
    ],
    week: {
      caption: 'Body moves slowly. Four days without a reading is normal here, not a gap.',
      days: [
        { fill: 0, label: 'M' },
        { fill: 0.9, label: 'T' },
        { fill: 0, label: 'W' },
        { fill: 0, label: 'T' },
        { fill: 0, label: 'F' },
        { fill: 0.88, label: 'S' },
        { fill: 0, label: 'S' },
      ],
    },
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Add a weigh-in',
    secondary: 'Connect a smart scale',
  },
  facets: [
    { detail: '3 in the last 14 days', label: 'Weigh-ins', state: 'reading' },
    { detail: 'Daily, from your watch', label: 'Resting heart rate', state: 'reading' },
    { detail: 'Shared with Labs', label: 'Composition', state: 'elsewhere' },
    { detail: 'Not connected yet', label: 'Measurements', state: 'missing' },
  ],
  observation: 'Your weigh-ins cluster at the start of the week and thin out after it.',
};

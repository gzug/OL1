import type { HubState } from '../hubState';

/** FIXTURE — invented for layout review. See the header of `../hubState.ts`. */
export const sleep: HubState = {
  basis: 'From 6 of the last 7 nights recorded by your watch.',
  cockpit: {
    periods: [
      {
        label: 'Last night',
        rows: [
          { label: 'Time asleep', value: '7h 05m', when: 'Sun → Mon' },
          { label: 'Went to bed', value: '23:48', when: 'about your usual' },
          { label: 'Woke', value: '06:53', when: 'earlier than usual' },
        ],
      },
      {
        label: 'This week',
        rows: [
          { label: 'Typical night', value: '6h 51m', when: 'across 6 nights' },
          { label: 'Shortest', value: '5h 32m', when: 'Wednesday' },
          { label: 'Longest', value: '8h 04m', when: 'Saturday' },
        ],
      },
    ],
    week: {
      caption: 'One night is missing — the watch was not worn on Friday.',
      days: [
        { fill: 0.82, label: 'M' },
        { fill: 0.74, label: 'T' },
        { fill: 0.61, label: 'W' },
        { fill: 0.79, label: 'T' },
        { fill: 0, label: 'F' },
        { fill: 0.94, label: 'S' },
        { fill: 0.83, label: 'S' },
      ],
    },
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Add a night by hand',
    secondary: 'Connect a second device',
  },
  facets: [
    { detail: '6 of the last 7 nights', label: 'Time asleep', state: 'reading' },
    { detail: 'Bed and wake times, 6 nights', label: 'Rhythm', state: 'reading' },
    { detail: 'Shared with Body', label: 'Resting heart rate', state: 'elsewhere' },
    { detail: 'Not connected yet', label: 'Sleep stages', state: 'missing' },
  ],
  observation: 'Your shortest nights land on the days you train in the evening.',
};

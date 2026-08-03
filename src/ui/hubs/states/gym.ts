import type { HubState } from '../hubState';

/** FIXTURE — invented for layout review. See the headers of `../hubState.ts` and `./running.ts`. */
export const gym: HubState = {
  basis: 'From 4 sessions in the last 14 days.',
  cockpit: {
    periods: [
      {
        label: 'Last session',
        rows: [
          { label: 'Time in session', value: '52 min', when: 'Thursday morning' },
          { label: 'Started', value: '07:15', when: 'earlier than usual' },
        ],
      },
      {
        label: 'Last 14 days',
        rows: [
          { label: 'Sessions', value: '4', when: 'across 4 days' },
          { label: 'Time in session', value: '3h 26m', when: 'in total' },
          { label: 'Longest gap', value: '5 days', when: 'between two sessions' },
        ],
      },
    ],
    week: {
      caption: 'Duration only. What was actually lifted is not something a session record carries.',
      days: [
        { fill: 0.74, label: 'M' },
        { fill: 0, label: 'T' },
        { fill: 0.66, label: 'W' },
        { fill: 0.9, label: 'T' },
        { fill: 0, label: 'F' },
        { fill: 0, label: 'S' },
        { fill: 0, label: 'S' },
      ],
    },
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Log a session',
    secondary: 'Write down what you lifted',
  },
  facets: [
    { detail: '4 in the last 14 days', label: 'Sessions', state: 'reading' },
    { detail: 'From the session record', label: 'Time in session', state: 'reading' },
    { detail: 'Not connected yet', label: 'Exercises and sets', state: 'missing' },
    { detail: 'Not in Health Connect sessions', label: 'Heart rate', state: 'missing' },
  ],
  observation: 'Your gym days sit at the start of the week and thin out after Thursday.',
};

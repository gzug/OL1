import type { HubState } from '../hubState';

/** FIXTURE — invented for layout review. See the header of `../hubState.ts`. */
export const nutrition: HubState = {
  basis: 'From 9 meals logged across 4 of the last 7 days.',
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
    note: 'Neither way in is built yet.',
    primary: 'Log a meal with a photo',
    secondary: 'Enter it by hand',
  },
  facets: [
    { detail: '9 logged across 4 of the last 7 days', label: 'Meals', state: 'reading' },
    { detail: 'Last lab report, 12 Mar', label: 'Micronutrients', state: 'reading' },
    { detail: 'Shared with Labs', label: 'Biomarkers', state: 'elsewhere' },
    { detail: 'Not connected yet', label: 'Hydration', state: 'missing' },
  ],
  observation: 'Your later meals land on the days you train in the evening.',
};

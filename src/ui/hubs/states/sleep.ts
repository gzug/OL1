import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * Three rules carried over from Legacy's `data/home/sleepRingModel.ts`, which records them as owner
 * decisions from 2026-07-27. They were re-derived worse here before anyone read that file:
 *
 * 1. **Attribution.** A deep/light/REM breakdown is the VENDOR's claim, not ours — the app does not
 *    compute stages, the watch does. Health Connect is *the pipe, not the measurer*, and naming it
 *    as the source would be re-badging. Without a nameable vendor there is no breakdown to show,
 *    only total duration, which needs no attribution because it is nobody's interpretation. That is
 *    why the stages facet below is missing rather than merely "not connected".
 * 2. **Denominator.** Time in bed includes awake; time asleep does not. Every number here is time
 *    ASLEEP, and nothing may describe a share "of your sleep" unless it really excludes awake.
 * 3. **No order.** Nothing may imply a chronology of the night. The seven-day strip is seven nights
 *    side by side, never a shape within one night.
 *
 * Legacy also keeps a night that never arrived ('missing') distinct from a read that failed
 * ('error') the whole way through. This fixture has no error state to show, but the distinction is
 * why Friday reads as "not worn" rather than as zero.
 */
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
    { detail: 'Shared with Resilience', label: 'Resting heart rate', state: 'elsewhere' },
    { detail: 'Needs a watch that names itself', label: 'Sleep stages', state: 'missing' },
  ],
  observation: 'Your shortest nights land on the days you train in the evening.',
};

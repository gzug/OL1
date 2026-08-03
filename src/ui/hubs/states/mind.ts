import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * Mind is Legacy's **Resilience**, renamed. An earlier version of this file said nothing was
 * connected to Mind at all, and that was wrong for an avoidable reason: the search for Legacy
 * material used OL1's word, "mind", and Legacy's word was "resilience". The owner caught it.
 * `hooks/useCurrentAnomalyTileIds.ts` maps `rhr_elevated → resilience`, and the domain runs through
 * `insights/engine/knowledgeBase.ts`, `WearablesGroupCard` and `data/persona/recoverySignals.ts`.
 *
 * So this hub reads what Legacy's Resilience read: heart-rate variability and resting heart rate.
 * That is worth being plain about — it is PHYSIOLOGICAL recovery, not mood or journaling. A hub
 * called Mind whose evidence is entirely cardiac is a real tension, and it is the owner's call; it
 * is recorded here so nobody quietly resolves it the other way.
 *
 * Two facets stay missing on purpose. Body battery and Garmin's own stress score are proprietary and
 * do NOT come through Android Health Connect, which is the route the owner chose over Legacy's
 * owner-run cloud box. Legacy's Resilience had them and this cannot, so the honest screen says so
 * rather than quietly narrowing what the domain claims to cover.
 */
export const mind: HubState = {
  basis: 'From heart-rate variability and resting heart rate on 6 of the last 7 nights.',
  cockpit: {
    periods: [
      {
        label: 'Last night',
        rows: [
          { label: 'Heart-rate variability', value: '48 ms', when: 'Sun → Mon' },
          { label: 'Resting heart rate', value: '54', when: 'lower than your week' },
        ],
      },
      {
        label: 'This week',
        rows: [
          { label: 'Typical variability', value: '44 ms', when: 'across 6 nights' },
          { label: 'Lowest', value: '31 ms', when: 'Wednesday' },
          { label: 'Nights recorded', value: '6 of 7', when: 'watch not worn Friday' },
        ],
      },
    ],
    week: {
      caption: 'Wednesday sits well below the rest of the week. Friday has no reading at all.',
      days: [
        { fill: 0.78, label: 'M' },
        { fill: 0.71, label: 'T' },
        { fill: 0.42, label: 'W' },
        { fill: 0.66, label: 'T' },
        { fill: 0, label: 'F' },
        { fill: 0.88, label: 'S' },
        { fill: 0.81, label: 'S' },
      ],
    },
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Write a note',
    secondary: 'Add how the day felt',
  },
  facets: [
    { detail: '6 of the last 7 nights', label: 'Heart-rate variability', state: 'reading' },
    { detail: 'Shared with Body', label: 'Resting heart rate', state: 'elsewhere' },
    { detail: 'Garmin only — not in Health Connect', label: 'Body battery', state: 'missing' },
    { detail: 'Garmin only — not in Health Connect', label: 'Stress score', state: 'missing' },
    { detail: 'Not connected yet', label: 'How the day felt', state: 'missing' },
  ],
  observation: 'Your lowest variability nights land after the days you train in the evening.',
};

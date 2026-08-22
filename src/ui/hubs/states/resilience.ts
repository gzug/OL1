import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * This hub was called Mind for one day. The owner renamed it to **Resilience** on 2026-08-03, which
 * is both Legacy's own name for the domain and a truer description of the evidence: heart-rate
 * variability and resting heart rate are physiological recovery, not mood or journaling. The rename
 * removes a mismatch rather than creating one.
 *
 * It was also briefly written as an empty hub, which was wrong for an avoidable reason: the search
 * for Legacy material used OL1's word, "mind", and Legacy's word was "resilience" — a word that
 * appears in no Legacy filename at all. `hooks/useCurrentAnomalyTileIds.ts` maps
 * `rhr_elevated → resilience`, and the domain runs through `insights/engine/knowledgeBase.ts`,
 * `WearablesGroupCard` and `data/persona/recoverySignals.ts`.
 *
 * Two facets stay missing on purpose. Body battery and Garmin's own stress score are proprietary and
 * do NOT come through Android Health Connect, which is the route the owner chose over Legacy's
 * owner-run cloud box. Legacy's Resilience had them and this cannot, so the honest screen says so
 * rather than quietly narrowing what the domain claims to cover. HRV and SpO2 are unaffected —
 * Health Connect carries both.
 */
export const resilience: HubState = {
  basis: 'The words are yours. Everything below the line waits for a watch.',
  /**
   * **The invented rows stay, and that is the honest answer here.**
   *
   * Unlike Exercise, Labs, Nutrition and Sleep, most of this hub genuinely cannot be filled yet:
   * heart-rate variability and resting heart rate need a watch, and the phone is deferred. A
   * cockpit that showed only "how the day felt" would imply the rest had been dropped.
   *
   * So the sample rows below still describe what this hub is FOR, and the real block —
   * `src/ui/resilience/DayCockpit.tsx` — sits above the line with the half that needs no device.
   * The `basis` line says which is which.
   */
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
    href: '/log-day',
    note: 'A watch waits for the phone. Describing a day does not.',
    primary: 'Add how the day felt',
    secondary: 'One word, and a note if you want one',
  },
  facets: [
    { detail: '6 of the last 7 nights', label: 'Heart-rate variability', state: 'reading' },
    { detail: 'On 6 of the last 7 nights', label: 'Resting heart rate', state: 'reading' },
    { detail: 'Garmin only — not in Health Connect', label: 'Body battery', state: 'missing' },
    { detail: 'Garmin only — not in Health Connect', label: 'Stress score', state: 'missing' },
    { detail: 'One word a day, typed by you', label: 'How the day felt', state: 'reading' },
  ],
  observation: 'Your lowest variability nights land after the days you train in the evening.',
};

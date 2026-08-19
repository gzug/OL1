import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * A new hub, named by the owner on 2026-08-19. **Labs sits inside it** rather than beside it on the
 * ring, so this cockpit answers for the domain and Labs answers for the panels.
 *
 * No week strip, and that is the point rather than an omission — the same argument `labs.ts` makes.
 * A condition is a standing fact and a medication is a daily one, but neither has a seven-day rhythm
 * worth drawing: a strip here would be seven identical days saying "still true".
 *
 * **Nothing here names a condition, a medication or a dose.** The fixtures rule is firmest about
 * exactly this: a public preview must not carry a diagnosis, and a plausible-looking one invites
 * being read as real. Counts and dates only — which is also what the screen would honestly show
 * before anything has been entered.
 */
export const medical: HubState = {
  basis: 'From what you have entered by hand. Nothing is read from a health record.',
  cockpit: {
    periods: [
      {
        label: 'Standing',
        rows: [
          { label: 'Conditions recorded', value: '1', when: 'entered 4 Feb' },
          { label: 'Medications', value: '2', when: 'both marked ongoing' },
          { label: 'Last reviewed by you', value: '4 Feb', when: 'about six months ago' },
        ],
      },
      {
        label: 'Since then',
        rows: [
          { label: 'Changes recorded', value: 'None', when: 'nothing since 4 Feb' },
          { label: 'Panels inside Labs', value: '1', when: 'uploaded 12 Mar' },
        ],
      },
    ],
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Record a condition',
    secondary: 'Add a medication',
  },
  facets: [
    { detail: '1 recorded, entered by hand', label: 'Conditions', state: 'reading' },
    { detail: '2 recorded, entered by hand', label: 'Medications', state: 'reading' },
    { detail: 'Inside this hub, 1 panel', label: 'Blood panels', state: 'elsewhere' },
    { detail: 'Not connected yet', label: 'Symptoms over time', state: 'missing' },
    { detail: 'Not connected yet', label: 'Appointments and letters', state: 'missing' },
  ],
  observation: 'Everything in this hub was entered in one sitting in February.',
};

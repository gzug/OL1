import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the headers of `../hubState.ts` and `./running.ts`.
 *
 * The thinnest hub that ships, and it is left thin on purpose. A round is a long, low-intensity
 * session, so duration says almost nothing worth reading — and everything golf is actually about,
 * from score to how the swing felt, is a thing only the user can write down. There is no
 * observation here because nothing has been read that supports one.
 *
 * No week strip: a round every couple of weeks would draw six empty bars and one full one.
 */
export const golf: HubState = {
  basis: 'From 2 rounds in the last 30 days.',
  cockpit: {
    periods: [
      {
        label: 'Last round',
        rows: [
          { label: 'Time on the course', value: '3h 48m', when: '11 days ago' },
        ],
      },
      {
        label: 'Last 30 days',
        rows: [
          { label: 'Rounds', value: '2', when: 'both on a Sunday' },
          { label: 'Time on the course', value: '7h 12m', when: 'in total' },
        ],
      },
    ],
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Log a round',
    secondary: 'Add a note about how it went',
  },
  facets: [
    { detail: '2 in the last 30 days', label: 'Rounds', state: 'reading' },
    { detail: 'From the session record', label: 'Time on the course', state: 'reading' },
    { detail: 'Yours to write down', label: 'Score', state: 'missing' },
    { detail: 'Yours to write down', label: 'How it felt', state: 'missing' },
  ],
};

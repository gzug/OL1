import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * This hub was called Activity until 2026-08-19, when the owner re-drew the ring and named it
 * **Exercise**. Running and Gym stay inside it — he considered putting them on the ring beside it
 * and decided against it, so this hub remains the honest total of everything you move rather than
 * a leftover holding whatever the named sports do not cover.
 */
export const exercise: HubState = {
  basis: 'From the sessions you have logged. No watch or phone is connected yet.',
  /**
   * **The sample cockpit is gone, because a real one exists.**
   *
   * `src/ui/exercise/SessionCockpit.tsx` builds "Last session" and "Last seven days" out of
   * somebody's own entries, above the sample line. Leaving the invented rows here would put two
   * near-identical blocks on one screen carrying different numbers — the exact "screen that cannot
   * agree with itself" that `weekly.ts` was written to end.
   *
   * The seven-bar strip went with them: `LoggedWeek` draws the real one, from the real window.
   *
   * The invented row that is NOT coming back is "Rest days". This app cannot tell a rest day from
   * an unlogged one, and says so in the caption under every strip it draws.
   */
  cockpit: {
    empty: 'Your own sessions fill the cockpit above this line. There is no invented one left here.',
    periods: [],
  },
  contribute: {
    /**
     * Two real ways in. Strava is an IMPORT rather than a connection — a file you request from
     * their website and this reads on your device — so it sits beside the by-hand button rather
     * than replacing it. Connecting a watch live still waits for the phone, which the note says.
     */
    also: { href: '/from-strava', label: 'Bring your history in from Strava' },
    href: '/log-session',
    note: 'Connecting a watch live waits for the phone. The Strava import needs no connection.',
    primary: 'Log a session by hand',
    secondary: 'What, how long, and how far if you measured it',
  },
  facets: [
    { detail: '5 sessions in the last 7 days', label: 'Sessions', state: 'reading' },
    { detail: 'Running and gym, 5 sessions', label: 'Exercise types', state: 'reading' },
    { detail: 'Shared with Sleep', label: 'Recovery', state: 'elsewhere' },
    { detail: 'Not connected yet', label: 'Routes', state: 'missing' },
  ],
};

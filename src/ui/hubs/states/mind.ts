import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * Mind is the empty hub, and it is in the repository on purpose. Legacy has no mind, stress or mood
 * file anywhere, so there was nothing to port and nothing is connected — which makes this the case
 * that proves the framework bends. There is no observation, because nothing has been read; there is
 * no week strip, because seven empty bars are a worse lie than one honest sentence; and there is no
 * `basis`, because a claim with no basis is exactly what the Standing band exists to prevent.
 *
 * If this screen looks too thin, the answer is to connect something to it, not to pad it. A hub that
 * fills itself when it knows nothing is the score page under another name.
 */
export const mind: HubState = {
  cockpit: {
    empty: 'Nothing is connected to Mind yet, so there is nothing to show. Its coach can still talk.',
    periods: [],
  },
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Write a note',
    secondary: 'Connect a check-in',
  },
  facets: [
    { detail: 'Not connected yet', label: 'Check-ins', state: 'missing' },
    { detail: 'Not connected yet', label: 'Mood', state: 'missing' },
    { detail: 'Shared with Sleep', label: 'Stress', state: 'elsewhere' },
    { detail: 'Not connected yet', label: 'Focus', state: 'missing' },
  ],
};

/**
 * The hubs a screen should draw: the seeded ones, plus whatever the user has made.
 *
 * A hook rather than a call because the answer arrives asynchronously — the store is SQLite on a
 * phone and `localStorage` on the web, and neither can be read while rendering.
 *
 * **It re-reads on focus, not only on mount.** `/new-hub` writes a hub and navigates back to Home,
 * and Home is not remounted by that navigation: without this, the hub you just made would be
 * missing until the app was restarted, which is the exact failure the store was built to end.
 *
 * The seeded hubs are returned immediately and the stored ones appear when the read settles, so the
 * ring never flashes empty. That ordering is deliberate: an orbit that appears from nothing on every
 * open would read as a slow app, and the six that ship are known before any I/O happens.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { hubs as defaultHubs } from '@/application/hubs/hubs';

import { visibleHubs } from '@/application/hubs/visibility';

import { SEED_HUBS, type HubDefinition } from './catalog';
import { mergeHubs } from './mergeHubs';

export type Hubs = {
  /** Ids the person has put away. */
  readonly hidden: readonly string[];
  /** Every hub that exists, hidden ones included. */
  readonly hubs: readonly HubDefinition[];
  /** What belongs on the ring. */
  readonly visible: readonly HubDefinition[];
};

export function useHubs(source = defaultHubs): Hubs {
  const [merged, setMerged] = useState<readonly HubDefinition[]>(SEED_HUBS);
  const [away, setAway] = useState<readonly string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void Promise.all([source.list(), source.hidden()])
        .then(([stored, hidden]) => {
          if (cancelled) return;
          setMerged(mergeHubs(stored));
          setAway(hidden);
        })
        .catch(() => {
          // A store that cannot be read leaves the seeded hubs on screen. The alternative is an
          // empty ring, which says "you have no hubs" — a claim about the user's data, made because
          // of a database error. Silence is the honest failure here.
        });

      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  /**
   * **`hubs` is every hub that exists; `visible` is the ones on the ring.**
   *
   * The two are deliberately separate rather than one filtered list. Hiding a hub is a statement
   * about the ring, not about a person's history — the Twin's ledger reads `hubs` and still shows
   * the meals logged in a Nutrition hub that has been put away, which is the same promise migration
   * 7 makes: nothing is deleted. A single filtered list would have quietly broken that the first
   * time somebody hid a hub they had used.
   */
  return { hidden: away, hubs: merged, visible: visibleHubs(merged, away) };
}

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

import { SEED_HUBS, type HubDefinition } from './catalog';
import { mergeHubs } from './mergeHubs';

export function useHubs(source = defaultHubs): readonly HubDefinition[] {
  const [merged, setMerged] = useState<readonly HubDefinition[]>(SEED_HUBS);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .list()
        .then((stored) => {
          if (!cancelled) setMerged(mergeHubs(stored));
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

  return merged;
}

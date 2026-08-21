/**
 * Everything the settings screen reads, in one pass, with a third state for "not read yet".
 *
 * **Why this does not call `useHubs`.** That hook is written for the ring, and when the store will
 * not open it leaves the seeded hubs on screen — the right answer there, because an empty ring says
 * *you have no hubs*. Here the same fallback would be a lie of a different shape: this screen also
 * prints which hubs are PUT AWAY, and a failed read of the hidden list would render as *nothing is
 * put away*, which is a claim about a person made out of a database error. So the read is done here
 * and its failure is a state rather than a default. `docs/decisions/0013`, shape 1.
 *
 * The hook only loads. Every judgement about what may be said lives in `settings.ts`, which is pure
 * and asserted in bare Node — the split `useBioAge` and `bioAge.ts` already make, for the same
 * reason: a decision inside a React effect is a decision nothing can test.
 *
 * `useFocusEffect` rather than `useEffect`: adding a hub from here leaves the screen and comes back
 * to it, and the row for the hub just made has to be there when it does.
 *
 * **Briefs are deliberately not read here.** `HubBrief` reads and writes its own, and rendering it
 * is what the coach section does — so a summary loaded here would be a second copy of the same
 * sentence, going stale the moment somebody edited the box beside it.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { profiles as defaultProfiles } from '@/application/profile/profile';
import type { HubEntry } from '@/core/hubs';
import type { Profile } from '@/core/profile';
import type { HubDefinition } from '@/ui/hubs/catalog';
import { mergeHubs } from '@/ui/hubs/mergeHubs';

import { FAILED, UNKNOWN, ready, type EntriesByHub, type Loaded } from './settings';

export type SettingsData = {
  readonly entries: EntriesByHub;
  readonly hidden: readonly string[];
  readonly hubs: readonly HubDefinition[];
};

export type Settings = {
  readonly data: Loaded<SettingsData>;
  /**
   * Read it all again. Called after every write rather than patching state in place — a screen that
   * updates its own copy of the store is a screen that can disagree with the store, and these reads
   * are cheap enough that being right is worth more than being instant.
   */
  reload: () => void;
  /** `null` inside `ready` is a real answer: nobody has ever told this app anything. */
  readonly profile: Loaded<Profile | null>;
};

export function useSettings(hubSource = defaultHubs, profileSource = defaultProfiles): Settings {
  const [data, setData] = useState<Loaded<SettingsData>>(UNKNOWN);
  const [profile, setProfile] = useState<Loaded<Profile | null>>(UNKNOWN);

  /**
   * Which read is the current one.
   *
   * A write is followed by a reload, and leaving the screen has to abandon whatever is in flight.
   * A counter answers both with one mechanism: every start claims the next number, and a read that
   * comes back holding an old one has been superseded and says nothing. A boolean per effect could
   * not do the second job, because `reload` is called from outside the effect.
   */
  const current = useRef(0);

  const load = useCallback(() => {
    const run = (current.current += 1);
    const latest = () => run === current.current;

    void (async () => {
      const [stored, hidden] = await Promise.all([hubSource.list(), hubSource.hidden()]);
      const merged = mergeHubs(stored);

      const loaded = await Promise.all(
        merged.map(async (hub) => ({ entries: await hubSource.entries(hub.id), id: hub.id })),
      );
      if (!latest()) return;

      const entries: Record<string, readonly HubEntry[]> = {};
      for (const hub of loaded) entries[hub.id] = hub.entries;

      setData(ready({ entries, hidden, hubs: merged }));
    })().catch(() => {
      // Not back to `unknown`: the lookup HAPPENED and did not work, and the screen says so rather
      // than sitting empty. Leaving the last good read standing would show answers that may no
      // longer be there; leaving an empty one would claim there are none.
      if (latest()) setData(FAILED);
    });

    void profileSource
      .read()
      .then((found) => {
        if (latest()) setProfile(ready(found));
      })
      .catch(() => {
        if (latest()) setProfile(FAILED);
      });
  }, [hubSource, profileSource]);

  useFocusEffect(
    useCallback(() => {
      load();
      // Leaving the screen abandons whatever is still in the air, by making it no longer current.
      return () => {
        current.current += 1;
      };
    }, [load]),
  );

  return { data, profile, reload: load };
}

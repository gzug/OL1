/**
 * Everything the settings screens read, in one pass, with a third state for "not read yet".
 *
 * **Why this does not call `useHubs`.** That hook is written for the ring, and when the store will
 * not open it leaves the seeded hubs on screen — the right answer there, because an empty ring says
 * *you have no hubs*. Here the same fallback would be a lie of a different shape: these screens also
 * print which hubs are put away, and a failed read of the hidden list would render as *nothing is
 * put away*, which is a claim about a person made out of a database error. So the read is done here
 * and its failure is a state rather than a default. `docs/decisions/0013`, shape 1.
 *
 * The hook only loads. Every judgement about what may be said lives in `settings.ts` and `rows.ts`,
 * which are pure and asserted in bare Node — the split `useBioAge` and `bioAge.ts` already make.
 *
 * `useFocusEffect` rather than `useEffect`: the index is returned to after every detail screen, and
 * the line under each row has to be right when it is.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { SPORT_HUB } from '@/application/exercise/sportCoaches';
import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { ageFrom, profiles as defaultProfiles } from '@/application/profile/profile';
import type { HubEntry } from '@/core/hubs';
import type { Profile } from '@/core/profile';
import { coachForHub, type HubDefinition } from '@/ui/hubs/catalog';
import { coachFor, mergeHubs } from '@/ui/hubs/mergeHubs';

import type { IndexFacts } from './rows';
import { FAILED, UNKNOWN, goalsHeld, hubRows, ready, sportsFrom, type EntriesByHub, type Loaded } from './settings';

export type SettingsData = {
  /** Only the briefs that are set. An absent key means no brief, never an unread one. */
  readonly briefs: Readonly<Record<string, string>>;
  readonly entries: EntriesByHub;
  readonly hidden: readonly string[];
  readonly hubs: readonly HubDefinition[];
  readonly profile: Profile | null;
};

export type Settings = {
  readonly data: Loaded<SettingsData>;
  /**
   * Read it all again. Called after every write rather than patching state in place — a screen that
   * updates its own copy of the store is a screen that can disagree with the store.
   */
  reload: () => void;
};

export function useSettings(hubSource = defaultHubs, profileSource = defaultProfiles): Settings {
  const [data, setData] = useState<Loaded<SettingsData>>(UNKNOWN);

  /**
   * Which read is the current one. A write is followed by a reload, and leaving the screen has to
   * abandon whatever is in flight; one counter answers both, where a boolean per effect could not,
   * because `reload` is called from outside the effect.
   */
  const current = useRef(0);

  const load = useCallback(() => {
    const run = (current.current += 1);
    const latest = () => run === current.current;

    void (async () => {
      const [stored, hidden, profile] = await Promise.all([
        hubSource.list(),
        hubSource.hidden(),
        profileSource.read(),
      ]);
      const merged = mergeHubs(stored);

      const loaded = await Promise.all(
        merged.map(async (hub) => ({
          brief: await hubSource.brief(hub.id),
          entries: await hubSource.entries(hub.id),
          id: hub.id,
        })),
      );
      if (!latest()) return;

      const briefs: Record<string, string> = {};
      const entries: Record<string, readonly HubEntry[]> = {};
      for (const hub of loaded) {
        entries[hub.id] = hub.entries;
        if (hub.brief !== null && hub.brief.length > 0) briefs[hub.id] = hub.brief;
      }

      setData(ready({ briefs, entries, hidden, hubs: merged, profile }));
    })().catch(() => {
      // Not back to `unknown`: the lookup HAPPENED and did not work, and the screen says so rather
      // than sitting empty or claiming there is nothing there.
      if (latest()) setData(FAILED);
    });
  }, [hubSource, profileSource]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        current.current += 1;
      };
    }, [load]),
  );

  return { data, reload: load };
}

/**
 * What the index says about itself, from one read.
 *
 * Pure and separate from the hook so it can be asserted in bare Node, and so the honesty rule is one
 * function rather than eleven components remembering it: `null` in, `null` out, and every line under
 * every row disappears until the store has actually answered.
 */
export function factsFrom(data: SettingsData, today: Date): IndexFacts {
  const coached = data.hubs.filter(
    (hub) => (coachForHub(hub.id, data.hubs) ?? coachFor(hub)) !== undefined,
  );
  const rows = hubRows(data.hubs, data.hidden);

  return {
    coachesTold: coached.filter((hub) => data.briefs[hub.id] !== undefined).length,
    coachesTotal: coached.length,
    goals: goalsHeld(data.entries).map((goal) => goal.label),
    hubsAway: rows.filter((row) => row.away).length,
    hubsOnRing: rows.filter((row) => !row.away).length,
    profile:
      data.profile === null
        ? null
        : {
            age: ageFrom(data.profile.birthYear, today),
            heightCm: data.profile.heightCm,
            sex: data.profile.sex,
          },
    sports: sportsFrom(data.entries[SPORT_HUB] ?? [])
      .filter((sport) => sport.named)
      .map((sport) => sport.label),
  };
}

/**
 * Your biological age, from the panel you approved and the year you were born.
 *
 * The calculator was ported on 3 August and the drivers on 20 August, and until now NEITHER had
 * ever been connected to a screen — the Twin showed a hard-coded 41.6. This is the wiring, and it
 * is the whole of what was missing: the maths was done and had no inputs.
 *
 * The hook only loads. Every decision about what can honestly be said lives in
 * `@/application/twin/bioAge`, which is pure and asserted in bare Node — a rule this repository
 * keeps because a judgement made inside a React effect is a judgement nothing can test.
 *
 * `useFocusEffect` rather than `useEffect`: adding a panel and coming back should show the new
 * number, and the Twin is a screen people return to rather than mount.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { profiles as defaultProfiles } from '@/application/profile/profile';
import { bioAgeFrom, type BioAge } from '@/application/twin/bioAge';

export type { BioAge };

export function useBioAge(hubSource = defaultHubs, profileSource = defaultProfiles): BioAge {
  // Not `noPanel`. Before the first read this app knows nothing, and saying otherwise is a claim.
  const [state, setState] = useState<BioAge>({ status: 'unknown' });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        const [entries, profile] = await Promise.all([
          hubSource.entries('labs'),
          profileSource.read(),
        ]);
        if (cancelled) return;
        setState(bioAgeFrom(entries, profile?.birthYear ?? null, new Date()));
      })().catch(() => {
        /* An unreadable store says nothing at all. It used to leave `noPanel` standing, so a
           database error told a person their blood results had never been added. */
        if (!cancelled) setState({ status: 'unknown' });
      });

      return () => {
        cancelled = true;
      };
    }, [hubSource, profileSource]),
  );

  return state;
}

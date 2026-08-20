import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { profiles as defaultProfiles } from '@/application/profile/profile';
import { useTheme } from '@/ui/theme';

import { needsFirstRun } from './firstRun';

/**
 * Whether this is somebody's first time, decided in one place and answered once.
 *
 * Home renders this as a sibling. It is a component rather than a hook so that adding the gate to
 * `src/app/index.tsx` is one line, and so that all three of its answers — including "not yet known"
 * — can be a rendered thing rather than a branch the route has to write out.
 *
 * **The cover is the whole reason this is not just a redirect.** The store is SQLite on a phone,
 * which takes long enough to open that Home would paint first and then be yanked away. An opaque
 * rectangle in the theme's own background colour holds that frame: a returning user sees one blank
 * beat, exactly as they already do while the fonts load in `_layout.tsx`, and a new user never sees
 * the ring before the flow that explains it.
 *
 * `useEffect`, not `useFocusEffect`: this asks once per mount, and `/welcome` leaves by `replace`,
 * so coming back to Home is a fresh mount with the profile already written.
 */
export function FirstRunGate({ source = defaultProfiles }: { source?: typeof defaultProfiles }) {
  const { colors } = useTheme();
  const [state, setState] = useState<'first' | 'returning' | 'unknown'>('unknown');

  useEffect(() => {
    let cancelled = false;

    void source
      .read()
      .then((profile) => {
        if (!cancelled) setState(needsFirstRun(profile) ? 'first' : 'returning');
      })
      .catch(() => {
        /**
         * A store that cannot be read shows Home. Sending somebody into onboarding because of a
         * database error would ask them for answers they have already given, and the flow would
         * then fail to write them for the same reason it failed to read them.
         */
        if (!cancelled) setState('returning');
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (state === 'unknown') {
    return (
      <View
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.cover, { backgroundColor: colors.background }]}
      />
    );
  }

  return state === 'first' ? <Redirect href="/welcome" /> : null;
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
});

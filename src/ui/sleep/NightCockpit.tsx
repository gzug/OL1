import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { HubEntry } from '@/core/hubs';
import { Period } from '@/ui/hubs/Period';
import { sleepPeriods } from '@/ui/sleep/cockpit';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * The Sleep cockpit, from the nights actually logged.
 *
 * Loads and renders; what the rows SAY is decided in `cockpit.ts` and asserted in bare Node.
 */
export function NightCockpit({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<readonly HubEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries('sleep')
        .then((found) => {
          if (!cancelled) setEntries(found);
        })
        .catch(() => {
          // Nothing rather than a cockpit this cannot stand behind.
        });

      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  const periods = sleepPeriods(entries, new Date().toISOString());
  if (periods.length === 0) return null;

  return (
    <View>
      {periods.map((period) => (
        <Fragment key={period.label}>
          <Period colors={colors} period={period} />
        </Fragment>
      ))}

      {/* The fixture said "recorded by your watch". There is no watch, and saying whose numbers
          these are matters more here than anywhere — sleep is the domain people most expect a
          device to have measured for them. */}
      <Text style={[styles.note, { color: colors.textSubtle }]}>
        Your own answers, typed in. No watch is involved in any of this yet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
});

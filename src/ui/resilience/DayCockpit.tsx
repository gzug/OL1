import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { HubEntry } from '@/core/hubs';
import { Period } from '@/ui/hubs/Period';
import { resiliencePeriods } from '@/ui/resilience/cockpit';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * The Resilience cockpit, from the days you have described.
 *
 * Loads and renders; what the rows SAY is decided in `cockpit.ts` and asserted in bare Node.
 */
export function DayCockpit({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<readonly HubEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries('resilience')
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

  const periods = resiliencePeriods(entries, new Date().toISOString());
  if (periods.length === 0) return null;

  return (
    <View>
      {periods.map((period) => (
        <Fragment key={period.label}>
          <Period colors={colors} period={period} />
        </Fragment>
      ))}

      {/* Said on the screen and not only in a decision note. The owner dropped a 0-to-100 recovery
          score; this block exists to be the thing that is NOT one. */}
      <Text style={[styles.note, { color: colors.textSubtle }]}>
        Counted, never averaged. Five words do not make a number, and nothing here will turn them
        into one.
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

import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { HubEntry } from '@/core/hubs';
import { exercisePeriods } from '@/ui/exercise/cockpit';
import { Period } from '@/ui/hubs/Period';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * The first cockpit made of somebody's own entries rather than invented for layout.
 *
 * It draws through `Period`, the same component the sample cockpit below the line uses, so one
 * screen does not end up with two visual languages for a labelled row. What the rows SAY is decided
 * in `cockpit.ts` and asserted in bare Node; this file loads and renders.
 *
 * Renders nothing at all when no session has been logged — `LoggedWeek` and `Heatmap` do the same,
 * and a hub nobody has used stays exactly as short as it was.
 */
export function SessionCockpit({
  hubId,
  source = defaultHubs,
}: {
  hubId: string;
  source?: typeof defaultHubs;
}) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<readonly HubEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries(hubId)
        .then((found) => {
          if (!cancelled) setEntries(found);
        })
        .catch(() => {
          // Nothing rather than a cockpit this cannot stand behind.
        });

      return () => {
        cancelled = true;
      };
    }, [hubId, source]),
  );

  const periods = exercisePeriods(entries, new Date().toISOString());
  if (periods.length === 0) return null;

  return (
    <View style={styles.block}>
      {periods.map((period) => (
        <Fragment key={period.label}>
          <Period colors={colors} period={period} />
        </Fragment>
      ))}

      {/* The caption the fixture never carried, and the reason its "Rest days" row had to go: this
          app cannot tell a rest day from an unlogged one, and says so everywhere else it counts. */}
      <Text style={[styles.note, { color: colors.textSubtle }]}>
        A day with nothing logged is not a rest day — it is a day this app did not see.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: spacing.sm },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
});

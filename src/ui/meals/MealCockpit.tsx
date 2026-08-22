import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { HubEntry } from '@/core/hubs';
import { Period } from '@/ui/hubs/Period';
import { nutritionPeriods } from '@/ui/meals/cockpit';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * The Nutrition cockpit, from the meals actually logged.
 *
 * Loads and renders; what the rows SAY is decided in `cockpit.ts` and asserted in bare Node.
 */
export function MealCockpit({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<readonly HubEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries('nutrition')
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

  const periods = nutritionPeriods(entries, new Date().toISOString());
  if (periods.length === 0) return null;

  return (
    <View>
      {periods.map((period) => (
        <Fragment key={period.label}>
          <Period colors={colors} period={period} />
        </Fragment>
      ))}

      {/* The sentence that keeps the per-meal choice honest on screen rather than only in a
          comment. A meal nobody logged is not in these numbers and cannot be. */}
      <Text style={[styles.note, { color: colors.textSubtle }]}>
        Averages of what you typed in, meal by meal. A meal you did not log is not in them, so this
        is what your logging looks like rather than what your week does.
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

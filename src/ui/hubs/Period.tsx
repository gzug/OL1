import { StyleSheet, Text, type TextStyle, View } from 'react-native';

import type { CockpitPeriod } from '@/ui/hubs/hubState';
import { fontFamily, numerals, spacing, tracking, typography, type ThemeColors } from '@/ui/theme';

/**
 * One labelled block of measured rows — the cockpit's only layout.
 *
 * **Lifted out of `HubScreen` unchanged**, because a real cockpit now exists beside the invented
 * one. `src/ui/exercise/SessionCockpit.tsx` reads a person's own sessions and has to draw them the
 * same way the fixture does, or the two blocks on one screen become two visual languages for the
 * same thing — which is the argument `metric.ts` makes about numbers, applied to rows.
 *
 * Nothing here decides what a row SAYS. It decides how a label, a date and a value sit together.
 */

export const tabularNums: TextStyle = { fontVariant: [...numerals.tabular.fontVariant] };

export function SectionLabel({ colors, label }: { colors: ThemeColors; label: string }) {
  return <Text style={[styles.sectionLabel, { color: colors.textSubtle }]}>{label}</Text>;
}

export function Period({ colors, period }: { colors: ThemeColors; period: CockpitPeriod }) {
  return (
    <>
      <SectionLabel colors={colors} label={period.label} />
      <View>
        {period.rows.map((row, index) => (
          <View
            key={row.label}
            style={[
              styles.dataRow,
              index > 0 && {
                borderTopColor: colors.borderSubtle,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ]}>
            <View style={styles.dataLeft}>
              <Text style={[styles.dataLabel, { color: colors.text }]}>{row.label}</Text>
              {/* The date is half the row. A number carrying an old date reads as today's result
                  until the reader checks, which is the trap the drift number's caption defuses. */}
              <Text style={[styles.dataWhen, { color: colors.textSubtle }]}>{row.when}</Text>
            </View>
            <Text style={[styles.dataValue, { color: colors.text }, tabularNums]}>{row.value}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dataLabel: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
  },
  dataLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  dataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  dataValue: {
    fontFamily: fontFamily.semi,
    fontSize: typography.body,
  },
  dataWhen: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: 1,
  },
  sectionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
});

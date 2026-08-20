import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import {
  EGFR_CAVEAT,
  EGFR_UNIT,
  STAGE_MEANING,
  estimatedGfr,
  gfrStage,
} from '@/application/labs/egfr';
import { ageFrom, profiles as defaultProfiles } from '@/application/profile/profile';
import { fontFamily, lineHeights, radius, spacing, tracking, typography, useTheme } from '@/ui/theme';

/**
 * Kidney function, from the panel already on file.
 *
 * The first of the derived metrics because it is the only one that needs nothing new — creatinine,
 * age and sex are all stored. It sits above the Labs fixtures, like `PanelAge` and `StoredEntries`,
 * so real content and invented content never mix.
 *
 * **The number arrives with its caveat, not above it.** A single creatinine moves with hydration, a
 * big protein meal and hard training in the days before a draw. That is not small print here; it is
 * the difference between a reading and a finding, and this app does not produce findings.
 */
export function KidneyFunction({
  hubSource = defaultHubs,
  profileSource = defaultProfiles,
}: {
  hubSource?: typeof defaultHubs;
  profileSource?: typeof defaultProfiles;
}) {
  const { colors } = useTheme();
  const [value, setValue] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        const [entries, profile] = await Promise.all([
          hubSource.entries('labs'),
          profileSource.read(),
        ]);
        if (cancelled) return;

        const panel = entries
          .filter((entry) => entry.kind === 'panel')
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

        const markers = panel?.payload.markers;
        const creatinine =
          typeof markers === 'object' && markers !== null
            ? (markers as Record<string, unknown>).creatinine
            : undefined;
        const age = ageFrom(profile?.birthYear ?? null, new Date());

        if (typeof creatinine !== 'number' || age === null || profile === null) {
          setValue(null);
          return;
        }

        setValue(estimatedGfr({ age, creatinine, sex: profile.sex }));
      })().catch(() => {
        // An unreadable store shows nothing rather than a number it cannot stand behind.
      });

      return () => {
        cancelled = true;
      };
    }, [hubSource, profileSource]),
  );

  /**
   * Nothing at all when it cannot be computed, rather than an empty state.
   *
   * `PanelAge` above already explains a missing panel, and a second box saying the same thing is
   * noise. The one case worth a word is a sex the equation cannot use — see `egfr.ts`.
   */
  if (value === null) return null;

  const stage = gfrStage(value);

  return (
    <View style={styles.block}>
      <Text style={[styles.heading, { color: colors.textSubtle }]}>KIDNEY FUNCTION</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.row}>
          <Text style={[styles.value, { color: colors.text }]}>{Math.round(value)}</Text>
          <Text style={[styles.unit, { color: colors.textMuted }]}>{EGFR_UNIT}</Text>
        </View>
        <Text style={[styles.meaning, { color: colors.textMuted }]}>{STAGE_MEANING[stage]}</Text>
        <Text style={[styles.caveat, { color: colors.textSubtle }]}>{EGFR_CAVEAT}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * `marginTop` is not decoration. Without it the heading sits flush against the last line of
   * `PanelAge` above and the two blocks read as one paragraph — caught by opening the deployed
   * screen, which is the only place crowding is visible. No gate here can see it.
   */
  block: { marginBottom: spacing.md, marginTop: spacing.lg },
  card: { borderRadius: radius.md, padding: spacing.md },
  caveat: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  heading: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.sm,
  },
  meaning: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
    marginTop: spacing.xs,
  },
  row: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm },
  unit: { fontFamily: fontFamily.body, fontSize: typography.caption },
  value: { fontFamily: fontFamily.display, fontSize: 34, lineHeight: 40 },
});

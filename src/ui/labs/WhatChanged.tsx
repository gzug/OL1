import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import {
  apartInWords,
  comparePanels,
  type PanelComparison,
} from '@/application/labs/panelChange';
import { LEVINE_MARKERS } from '@/ui/labs/levine';
import { EXTRA_MARKERS } from '@/ui/labs/lipids';
import { fontFamily, lineHeights, radius, spacing, tracking, typography, useTheme } from '@/ui/theme';

/**
 * What moved between your last two panels.
 *
 * The app says in three places that a second panel turns a reading into a direction. This is the
 * screen behind that sentence, and it only exists once there really are two.
 *
 * **Two panels are a line, not a trend.** Every design choice here follows from that: a small move
 * shows both numbers and no arrow, the interval between draws is stated because six days and a year
 * are different claims, and the closing line says plainly what two points can and cannot support.
 */

/**
 * Every marker's name, the nine and the rest.
 *
 * A lipid moving between two panels is the change most worth seeing — cholesterol is usually the
 * thing somebody is watching — and it used to be absent from this comparison altogether.
 */
const LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  [...LEVINE_MARKERS, ...EXTRA_MARKERS].map((marker) => [marker.key, marker.label]),
);

/** At most two decimals, no trailing zeroes — a converted value is rarely the decimal it looks like. */
function tidy(value: number): number {
  return Math.round(value * 100) / 100;
}

export function WhatChanged({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const [comparison, setComparison] = useState<PanelComparison | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries('labs')
        .then((entries) => {
          if (cancelled) return;

          // Newest first, by the date the blood was DRAWN.
          const panels = entries
            .filter((entry) => entry.kind === 'panel')
            .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

          const [later, earlier] = panels;
          if (later === undefined || earlier === undefined) {
            setComparison(null);
            return;
          }

          const markersOf = (payload: Readonly<Record<string, unknown>>) => {
            const found = payload.markers;
            return typeof found === 'object' && found !== null
              ? (found as Record<string, unknown>)
              : {};
          };

          setComparison(
            comparePanels(
              { markers: markersOf(earlier.payload), recordedAt: earlier.recordedAt },
              { markers: markersOf(later.payload), recordedAt: later.recordedAt },
            ),
          );
        })
        .catch(() => {
          // One panel, or none, or a store that will not read: no comparison rather than a wrong one.
        });

      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  /** Nothing until there are two. `PanelAge` already says what a single panel is. */
  if (comparison === null || comparison.changes.length === 0) return null;

  return (
    <View style={styles.block}>
      <Text style={[styles.heading, { color: colors.textSubtle }]}>WHAT CHANGED</Text>
      <Text style={[styles.gap, { color: colors.textMuted }]}>
        Your last two panels, {apartInWords(comparison.daysApart)}.
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {comparison.changes.map((change, index) => (
          <Fragment key={change.key}>
            {index > 0 && <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />}
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text }]}>
                {LABEL[change.key] ?? change.key}
              </Text>
              <Text style={[styles.values, { color: colors.text }]}>
                {change.from === null ? '—' : tidy(change.from)}
                {'  →  '}
                {change.to === null ? '—' : tidy(change.to)}{' '}
                <Text style={[styles.unit, { color: colors.textSubtle }]}>{change.unit}</Text>
              </Text>
            </View>
            {/* A direction only where the move clears the threshold. Below it the two numbers stand
                on their own — an arrow drawn on assay noise invents a trajectory. */}
            {change.notable && change.direction !== null && (
              <Text style={[styles.note, { color: colors.textMuted }]}>
                {change.direction === 'up' ? 'Higher' : 'Lower'} than last time.
              </Text>
            )}
            {change.direction === null && (
              <Text style={[styles.note, { color: colors.textSubtle }]}>
                On only one of the two panels, so there is nothing to compare.
              </Text>
            )}
          </Fragment>
        ))}
      </View>

      {/**
       * The sentence the whole file is built around. It is last because it is what a person should
       * leave with, and it is not smaller than the rows above it.
       */}
      <Text style={[styles.closing, { color: colors.textSubtle }]}>
        Two panels are a line, not a trend. Blood moves with the time of day, hydration, a hard
        session, and an illness weeks earlier — and every test has some spread of its own. Only
        moves of more than a tenth are called higher or lower here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: spacing.md, marginTop: spacing.lg },
  card: { borderRadius: radius.md, paddingHorizontal: spacing.md },
  closing: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  gap: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    marginBottom: spacing.sm,
  },
  heading: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xs,
  },
  label: { flexShrink: 1, fontFamily: fontFamily.body, fontSize: typography.bodySmall },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    paddingBottom: spacing.sm,
  },
  row: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rule: { height: StyleSheet.hairlineWidth },
  unit: { fontFamily: fontFamily.body, fontSize: typography.micro },
  values: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
});

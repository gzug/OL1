import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  bucketOpacity,
  buildHeatmap,
  lifetimeLine,
  windowLine,
  minutesByDate,
} from '@/application/exercise/heatmap';
import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { HubEntry } from '@/core/hubs';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * Training consistency, as a grid of days.
 *
 * The maths is Legacy's, ported in `application/exercise/heatmap.ts` with its two decisions intact:
 * the grid anchors to today while the data is fresh and to the data once it is cold, and a square's
 * darkness is relative to the busiest day rather than to a target.
 *
 * Twelve weeks, which is the most that fits on a phone at a readable square size and is also about
 * as far back as "am I being consistent" is a question anybody asks.
 */

const WEEKS = 12;
const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S'];

export function Heatmap({ hubId, source = defaultHubs }: { hubId: string; source?: typeof defaultHubs }) {
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
          // Unreadable store draws no grid. It must never draw an empty one, which would say
          // "you did nothing" on the strength of a database error.
        });
      return () => {
        cancelled = true;
      };
    }, [hubId, source]),
  );

  const grid = buildHeatmap(minutesByDate(entries), WEEKS, new Date().toISOString().slice(0, 10));
  if (!grid.hasData) return null;

  return (
    <View style={styles.block}>
      {/* The heading follows the grid rather than asserting over it. See `windowLine`. */}
      <Text style={[styles.label, { color: colors.textSubtle }]}>{windowLine(grid, WEEKS)}</Text>

      <View style={styles.grid}>
        <View style={styles.days}>
          {DAY_LABELS.map((label, index) => (
            <Text key={index} style={[styles.dayLabel, { color: colors.textSubtle }]}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.columns}>
          {grid.rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((cell) => (
                <View
                  key={cell.key}
                  style={[
                    styles.cell,
                    {
                      backgroundColor:
                        cell.bucket === 0 ? colors.borderSubtle : colors.accent,
                      opacity: cell.bucket === 0 ? 1 : bucketOpacity(cell.bucket),
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/**
        * **"All time" is doing real work here.** These totals count every session ever logged, and
        * they sat under a twelve-week heading joined by a middle dot to a clause that IS about the
        * grid — so they read as twelve weeks' worth. Importing years of history from Strava makes
        * that gap enormous rather than merely wrong.
        */}
      <Text style={[styles.note, { color: colors.textSubtle }]}>
        All time: {lifetimeLine(entries)}. Darkest is your busiest day above — an empty square means
        nothing was logged, not that nothing happened.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingTop: spacing.lg },
  cell: { borderRadius: 2, height: 9, width: 9 },
  columns: { gap: 3 },
  dayLabel: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    height: 12,
    lineHeight: 12,
  },
  days: { gap: 0, paddingTop: 0 },
  grid: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
  },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  row: { flexDirection: 'row', gap: 3 },
});

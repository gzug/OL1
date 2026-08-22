import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import {
  MIN_DAYS_FOR_A_WEEKLY_CLAIM,
  weekOfEntries,
  weekStrip,
  type WeekOfEntries,
} from '@/application/hubs/weekly';
import type { HubEntry } from '@/core/hubs';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * A hub's own week, from what was actually logged in it.
 *
 * This is the first thing on any hub screen that is neither a fixture nor a bare count — it reads
 * the store and says what the store supports. Everything below it on the screen is still invented
 * for layout review, and `StoredEntries` above it draws the line.
 *
 * **It refuses to say "this week" until a week is under it.** Legacy's rule, ported in
 * `application/hubs/weekly.ts`. Under four logged days it reports the days it has and stops; the
 * silence is the design, not a missing feature.
 */

const WORDS: Readonly<Record<string, { one: string; many: string; verb: string }>> = {
  day: { many: 'days', one: 'day', verb: 'described' },
  meal: { many: 'meals', one: 'meal', verb: 'logged' },
  night: { many: 'nights', one: 'night', verb: 'logged' },
  panel: { many: 'panels', one: 'panel', verb: 'added' },
  session: { many: 'sessions', one: 'session', verb: 'logged' },
};

export function LoggedWeek({
  hubId,
  kind,
  source = defaultHubs,
}: {
  hubId: string;
  kind: string;
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
          // Unreadable store, nothing shown. The fixtures below are labelled as fixtures, so
          // nothing here can be mistaken for a reading that failed to load.
        });
      return () => {
        cancelled = true;
      };
    }, [hubId, source]),
  );

  const now = new Date().toISOString();
  const week: WeekOfEntries = weekOfEntries(entries, kind, now);
  if (week.total === 0) return null;

  const words = WORDS[kind] ?? { many: `${kind} entries`, one: `${kind} entry`, verb: 'recorded' };
  const strip = weekStrip(entries, kind, now);
  const noun = (count: number) => (count === 1 ? words.one : words.many);

  return (
    <View style={styles.block}>
      <Text style={[styles.headline, { color: colors.text }]}>
        {week.weeklyClaimAllowed
          ? `${week.total} ${noun(week.total)} ${words.verb} across ${week.days} of the last 7 days.`
          : `${week.total} ${noun(week.total)} ${words.verb} on ${week.days} ${
              week.days === 1 ? 'day' : 'days'
            }.`}
      </Text>

      {/* The refusal, said out loud rather than left as an absence. Someone who logged twice should
          know why the screen is not talking about their week, and that four days will change it. */}
      {!week.weeklyClaimAllowed && (
        <Text style={[styles.note, { color: colors.textSubtle }]}>
          Not enough days yet to say anything about your week — {MIN_DAYS_FOR_A_WEEKLY_CLAIM} of 7
          is where that starts.
        </Text>
      )}

      <View style={styles.strip}>
        {strip.map((day, index) => (
          <View key={`${day.label}-${index}`} style={styles.day}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: day.fill === 0 ? colors.borderSubtle : colors.accent,
                  height: 4 + day.fill * 24,
                },
              ]}
            />
            <Text style={[styles.dayLabel, { color: colors.textSubtle }]}>{day.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.note, { color: colors.textSubtle }]}>
        {/* A zero bar is "nothing logged", never "nothing happened" — the app cannot tell those
            apart and must not pretend to. Legacy's `dataState` makes the same distinction. */}
        Tallest is your busiest day. An empty day means nothing was logged, not that nothing
        happened.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderRadius: 2, width: 10 },
  block: { paddingTop: spacing.md },
  day: { alignItems: 'center', gap: 4 },
  dayLabel: { fontFamily: fontFamily.body, fontSize: typography.micro },
  headline: {
    fontFamily: fontFamily.body,
    fontSize: typography.body,
    lineHeight: lineHeights.body,
  },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  strip: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    height: 40,
    marginTop: spacing.md,
  },
});

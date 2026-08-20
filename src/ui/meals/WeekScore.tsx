import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { entriesThisWeek } from '@/application/hubs/weekly';
import {
  MIN_MEALS,
  confidenceSentence,
  nutritionScore,
  partsUsed,
} from '@/application/nutrition/score';
import type { HubEntry } from '@/core/hubs';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * The week's logging, scored.
 *
 * **Read `docs/decisions/0009-a-score-for-the-week-not-the-person.md` before changing anything
 * here.** This is the one score in the app, it exists under a narrow argument, and two sentences on
 * this screen are what keep that argument true:
 *
 * 1. **The confidence sentence**, which says how much logging the number is standing on. It is
 *    beside the number, never behind a tap. A perfect week recorded twice scores badly and this is
 *    the line that explains why.
 * 2. **Which parts it used.** `wholeFood` is always absent today, so the score is made of protein
 *    and fibre. If that sentence ever stops being shown, the number starts overstating itself.
 *
 * Neither is decoration. Deleting either one turns a reading into a verdict.
 */

export function WeekScore({ source = defaultHubs }: { source?: typeof defaultHubs }) {
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
          // Unreadable store shows no score. A score computed from nothing would be the worst
          // possible version of this component.
        });
      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  /**
   * The same seven days `LoggedWeek` counts, through the same function.
   *
   * This said "this week's logging" while scoring every meal ever recorded, including one dated an
   * hour into the future — so the screen printed "5 meals logged on 3 days" directly above "From 6
   * meals across 4 days". Two numbers for the same meals is the fastest way to lose someone's trust
   * in every other number on the page.
   */
  const meals = entriesThisWeek(entries, 'meal', new Date().toISOString()).map((entry) => ({
    payload: entry.payload,
    recordedAt: entry.recordedAt,
  }));

  if (meals.length === 0) return null;

  const score = nutritionScore(meals);
  const parts = partsUsed(score);

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.textSubtle }]}>THIS WEEK’S LOGGING</Text>

      {score.quality === null ? (
        /* The floor `0004` asked for, and it is a refusal rather than a placeholder: below three
           meals there is no number, and the screen says what would change that. */
        <Text style={[styles.withheld, { color: colors.text }]}>
          Not enough yet to score. {MIN_MEALS} meals is where it starts — you have{' '}
          {score.loggedMeals}.
        </Text>
      ) : (
        <>
          <View style={styles.numberRow}>
            <Text style={[styles.number, { color: colors.text }]}>{score.quality}</Text>
            <Text style={[styles.outOf, { color: colors.textSubtle }]}>out of 100</Text>
          </View>

          {/* Both sentences are load-bearing. See the note at the top of this file. */}
          <Text style={[styles.basis, { color: colors.textMuted }]}>
            {confidenceSentence(score)}
          </Text>
          <Text style={[styles.basis, { color: colors.textSubtle }]}>
            {parts.length === 1
              ? `Made of ${parts[0]} alone — nothing else was recorded.`
              : `Made of ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.`}
            {score.subScores.wholeFood === null &&
              ' Whole food is not counted: meals record macros, not a list of ingredients.'}
          </Text>
        </>
      )}

      {/* The sentence that keeps 0009 honest on screen rather than only in a document. */}
      <Text style={[styles.rule, { color: colors.textSubtle }]}>
        This scores how much you logged and what was in it — not how you are doing.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  basis: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
  },
  block: { paddingTop: spacing.lg },
  label: { fontFamily: fontFamily.medium, fontSize: typography.micro },
  number: {
    fontFamily: fontFamily.display,
    fontSize: typography.heroName,
    lineHeight: typography.heroName * 1.05,
  },
  numberRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  outOf: { fontFamily: fontFamily.body, fontSize: typography.caption },
  rule: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    fontStyle: 'italic',
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  withheld: {
    fontFamily: fontFamily.body,
    fontSize: typography.body,
    lineHeight: lineHeights.body,
    marginTop: spacing.xs,
  },
});

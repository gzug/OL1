import { Link } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fontFamily, lineHeights, radius, spacing, tracking, typography, useTheme } from '@/ui/theme';
import { drawnOn, years } from '@/ui/twin/bioAgeCopy';
import { METHOD_EXPLANATION, METHOD_LIMITS, methodRows } from '@/ui/twin/bioAgeMethod';
import { useBioAge } from '@/ui/twin/useBioAge';

/**
 * How your biological age was worked out, and what went into it.
 *
 * Asked for by the owner on the day OL1's answer disagreed with an app he pays for. That is the
 * moment this screen is for: when two numbers differ, the useful thing is not reassurance, it is
 * the inputs. The gap in that case was one marker read two different ways, and this screen is where
 * that would have been visible in a minute rather than an afternoon.
 *
 * Order: the number, then what went in, then the method, then what the method cannot do. The limits
 * are last but not smaller — they are how to read the number, not a disclaimer under it.
 */
export function BioAgeMethod() {
  const { colors } = useTheme();
  const bioAge = useBioAge();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Link asChild href="/twin">
        <Pressable accessibilityRole="link" style={styles.back}>
          <Text style={[styles.backText, { color: colors.textMuted }]}>← Digital Twin</Text>
        </Pressable>
      </Link>

      <Text style={[styles.title, { color: colors.text }]}>How this was worked out</Text>

      {bioAge.status !== 'ready' ? (
        <Text style={[styles.body, { color: colors.textMuted }]}>
          There is no number yet, so there is nothing to explain. Add a blood panel and your year of
          birth, and this page will show every value that went into it.
        </Text>
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.number, { color: colors.text }]}>
              {bioAge.range.missing.length === 0
                ? years(bioAge.range.point)
                : `${years(bioAge.range.low)}–${years(bioAge.range.high)}`}
            </Text>
            <Text style={[styles.numberNote, { color: colors.textSubtle }]}>
              From blood drawn {drawnOn(bioAge.drawnAt)}, against a chronological age of{' '}
              {bioAge.used.chronologicalAge}.
            </Text>
          </View>

          <Text style={[styles.section, { color: colors.textSubtle }]}>WHAT WENT IN</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {methodRows(bioAge.used).map((row, index) => (
              <Fragment key={row.key}>
                {index > 0 && (
                  <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />
                )}
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{row.label}</Text>
                  <Text style={[styles.rowValue, { color: colors.text }]}>
                    {row.asRead} {row.unit}
                  </Text>
                </View>
                {row.asEntered !== null && (
                  <Text style={[styles.rowNote, { color: colors.textSubtle }]}>{row.asEntered}</Text>
                )}
                {/* The one place the formula reads something other than what the laboratory
                    measured. Saying so is the whole reason this screen exists. */}
                {row.adjustment !== null && (
                  <Text style={[styles.rowNote, { color: colors.warning }]}>{row.adjustment}</Text>
                )}
              </Fragment>
            ))}
          </View>

          {bioAge.range.missing.length > 0 && (
            <Text style={[styles.body, { color: colors.textMuted }]}>
              {bioAge.range.missing.length} of the nine were not on this panel, which is why the
              answer above is a range rather than a single figure.
            </Text>
          )}
        </>
      )}

      <Text style={[styles.section, { color: colors.textSubtle }]}>THE METHOD</Text>
      {METHOD_EXPLANATION.map((paragraph) => (
        <Text key={paragraph} style={[styles.body, { color: colors.textMuted }]}>
          {paragraph}
        </Text>
      ))}

      <Text style={[styles.section, { color: colors.textSubtle }]}>WHAT IT CANNOT DO</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {METHOD_LIMITS.map((limit, index) => (
          <Fragment key={limit}>
            {index > 0 && <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />}
            <Text style={[styles.limit, { color: colors.textMuted }]}>{limit}</Text>
          </Fragment>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { paddingVertical: spacing.sm },
  backText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  body: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  content: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  limit: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    paddingVertical: spacing.sm,
  },
  number: { fontFamily: fontFamily.display, fontSize: 40, lineHeight: 46, textAlign: 'center' },
  numberNote: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    textAlign: 'center',
  },
  row: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowLabel: { flexShrink: 1, fontFamily: fontFamily.body, fontSize: typography.bodySmall },
  rowNote: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    paddingBottom: spacing.xs,
  },
  rowValue: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  rule: { height: StyleSheet.hairlineWidth },
  section: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: typography.heroInterpretation,
    letterSpacing: tracking.tight,
    marginBottom: spacing.md,
  },
});

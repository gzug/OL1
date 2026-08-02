import { Link } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fontFamily, lineHeights, radius, spacing, typography, useTheme } from '@/ui/theme';

import { centre, twin } from './fixtures';

/**
 * Digital Twin.
 *
 * Scroll order is an argument, not a preference:
 *   person file    — whose twin is this, and what does it already know
 *   running test   — the only time-bound thing here, and the only thing you are inside
 *   today's ask    — pinned directly under it, styled exactly like Home's daily focus, so the rule
 *                    that the two never compete is visible rather than merely asserted
 *   insights       — read, not acted on
 *   completed      — evidence sits under the claim it supports
 *   ledger         — longest, densest, least urgent; the only section anyone scrolls *to*
 *
 * A running test lives here rather than on Home because it shows nothing for thirteen days out of
 * fourteen, and the centre of Home cannot carry a permanently static element.
 */
export function TwinMockup() {
  const { colors } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Link asChild href="/">
        <Pressable accessibilityRole="link" style={styles.homeLink}>
          <Text style={[styles.homeLinkText, { color: colors.textMuted }]}>⌄  Home</Text>
        </Pressable>
      </Link>

      <Text style={[styles.personName, { color: colors.text }]}>{twin.person.name}</Text>
      <Text style={[styles.personFacts, { color: colors.textSubtle }]}>
        {twin.person.facts.join(' · ')}
      </Text>

      <Section title="Running test">
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{twin.runningTest.title}</Text>
            <Text style={[styles.cardMeta, { color: colors.textSubtle }]}>
              {twin.runningTest.label}
            </Text>
          </View>
          <View style={styles.ticks}>
            {Array.from({ length: twin.runningTest.daysTotal }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.tick,
                  {
                    backgroundColor:
                      index < twin.runningTest.daysDone ? colors.accent : colors.border,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.cardNote, { color: colors.textSubtle }]}>Nothing conclusive yet.</Text>
        </View>

        <View style={[styles.focusPill, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.focusText, { color: colors.accent }]}>{centre.focus}</Text>
        </View>
      </Section>

      <Section title="Insights">
        {twin.insights.map((insight) => (
          <View key={insight} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.insight, { color: colors.text }]}>{insight}</Text>
          </View>
        ))}
      </Section>

      <Section title="Completed tests">
        {twin.completedTests.map((test) => (
          <View key={test.title} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{test.title}</Text>
            <Text style={[styles.outcome, { color: colors.textMuted }]}>
              Result · {test.outcome}
            </Text>
          </View>
        ))}
      </Section>

      <Section title="Ledger">
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {twin.ledger.map((row, index) => (
            <Fragment key={`${row.date}-${row.entry}`}>
              {index > 0 && <View style={[styles.rowRule, { backgroundColor: colors.borderSubtle }]} />}
              <View style={styles.ledgerRow}>
                <Text style={[styles.ledgerDate, { color: colors.textSubtle }]}>{row.date}</Text>
                <Text style={[styles.ledgerEntry, { color: colors.textMuted }]}>{row.entry}</Text>
              </View>
            </Fragment>
          ))}
        </View>
        <Text style={[styles.ledgerFooter, { color: colors.textSubtle }]}>{twin.ledgerFooter}</Text>
      </Section>
    </ScrollView>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
  },
  cardNote: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: spacing.sm,
  },
  cardTitle: {
    fontFamily: fontFamily.semi,
    fontSize: typography.body,
  },
  content: {
    paddingBottom: 48,
    paddingHorizontal: spacing.lg,
  },
  /** Styled exactly like Home's daily focus, so the repeat reads as the same object. */
  focusPill: {
    alignSelf: 'flex-start',
    borderRadius: 13,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  focusText: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
  },
  homeLink: {
    alignSelf: 'center',
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  homeLinkText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    letterSpacing: 0.4,
  },
  insight: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.body,
  },
  ledgerDate: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    width: 56,
  },
  ledgerEntry: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
  },
  ledgerFooter: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    paddingLeft: 2,
  },
  ledgerRow: {
    flexDirection: 'row',
    paddingVertical: 9,
  },
  outcome: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  personFacts: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: spacing.xs,
  },
  personName: {
    fontFamily: fontFamily.semi,
    fontSize: 18,
  },
  rowRule: {
    height: 1,
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    fontFamily: fontFamily.strong,
    fontSize: 11,
    letterSpacing: 0.9,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  tick: {
    borderRadius: 2,
    flex: 1,
    height: 6,
  },
  ticks: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});

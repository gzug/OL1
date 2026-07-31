import { Link } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { centre, twin } from './fixtures';
import { color } from './tokens';

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
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Link asChild href="/">
        <Pressable accessibilityRole="link" style={styles.homeLink}>
          <Text style={styles.homeLinkText}>⌄  Home</Text>
        </Pressable>
      </Link>

      <Text style={styles.personName}>{twin.person.name}</Text>
      <Text style={styles.personFacts}>{twin.person.facts.join(' · ')}</Text>

      <Section title="Running test">
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{twin.runningTest.title}</Text>
            <Text style={styles.cardMeta}>{twin.runningTest.label}</Text>
          </View>
          <View style={styles.ticks}>
            {Array.from({ length: twin.runningTest.daysTotal }, (_, index) => (
              <View
                key={index}
                style={[styles.tick, index < twin.runningTest.daysDone && styles.tickDone]}
              />
            ))}
          </View>
          <Text style={styles.cardNote}>Nothing conclusive yet.</Text>
        </View>

        <View style={styles.focusPill}>
          <Text style={styles.focusText}>{centre.focus}</Text>
        </View>
      </Section>

      <Section title="Insights">
        {twin.insights.map((insight) => (
          <View key={insight} style={styles.card}>
            <Text style={styles.insight}>{insight}</Text>
          </View>
        ))}
      </Section>

      <Section title="Completed tests">
        {twin.completedTests.map((test) => (
          <View key={test.title} style={styles.card}>
            <Text style={styles.cardTitle}>{test.title}</Text>
            <Text style={styles.outcome}>Result · {test.outcome}</Text>
          </View>
        ))}
      </Section>

      <Section title="Ledger">
        <View style={styles.card}>
          {twin.ledger.map((row, index) => (
            <Fragment key={`${row.date}-${row.entry}`}>
              {index > 0 && <View style={styles.rowRule} />}
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerDate}>{row.date}</Text>
                <Text style={styles.ledgerEntry}>{row.entry}</Text>
              </View>
            </Fragment>
          ))}
        </View>
        <Text style={styles.ledgerFooter}>{twin.ledgerFooter}</Text>
      </Section>
    </ScrollView>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: 12,
    marginBottom: 8,
    padding: 14,
  },
  cardHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMeta: {
    color: color.textQuiet,
    fontSize: 12,
  },
  cardNote: {
    color: color.textQuiet,
    fontSize: 12,
    marginTop: 10,
  },
  cardTitle: {
    color: color.text,
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  /** Styled exactly like Home's daily focus, so the repeat reads as the same object. */
  focusPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(231, 255, 87, 0.10)',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  focusText: {
    color: color.accent,
    fontSize: 11.5,
  },
  homeLink: {
    alignSelf: 'center',
    paddingBottom: 10,
    paddingTop: 14,
  },
  homeLinkText: {
    color: color.textQuiet,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  insight: {
    color: color.text,
    fontSize: 14,
    lineHeight: 20,
  },
  ledgerDate: {
    color: color.textQuiet,
    fontSize: 12,
    width: 56,
  },
  ledgerEntry: {
    color: color.textMuted,
    flex: 1,
    fontSize: 13,
  },
  ledgerFooter: {
    color: color.textQuiet,
    fontSize: 12,
    paddingLeft: 2,
  },
  ledgerRow: {
    flexDirection: 'row',
    paddingVertical: 9,
  },
  outcome: {
    color: color.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  personFacts: {
    color: color.textQuiet,
    fontSize: 12,
    marginTop: 4,
  },
  personName: {
    color: color.text,
    fontSize: 18,
    fontWeight: '600',
  },
  rowRule: {
    backgroundColor: color.hairline,
    height: 1,
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    color: color.textQuiet,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  ticks: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
  },
  tick: {
    backgroundColor: color.hairline,
    borderRadius: 2,
    flex: 1,
    height: 6,
  },
  tickDone: {
    backgroundColor: color.accent,
    opacity: 0.75,
  },
});

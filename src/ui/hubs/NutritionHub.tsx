import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';

import type { Hub } from '@/ui/mockup/fixtures';
import {
  fontFamily,
  layout,
  lineHeights,
  numerals,
  radius,
  spacing,
  tracking,
  typography,
  useTheme,
  type ThemeColors,
} from '@/ui/theme';

import type { FacetState, HubState } from './fixtures';

/**
 * A hub's own state: the domain's evidence, not its verdict.
 *
 * Four bands, argued in `docs/decisions/0004-nutrition-hub.md`. Standing says what the domain sees
 * and what that rests on. Coverage says how much it is entitled to claim — this is the band that
 * replaces the score, because it stays true when the data is thin instead of needing a floor under
 * which it lies. Contribute is the domain's own way in, which is what stops a hub being a dashboard.
 * Take to the table is the only route to chat, and every row carries a subject: chat is one step
 * further in, never the front door, and never an empty box.
 *
 * Paper and hairlines, not cards and shadows, carried over from Legacy's `NutritionHubScreen`:
 * plain backgrounds, no elevation, sections divided by `StyleSheet.hairlineWidth`. Serif carries the
 * one interpretation on the screen; sans carries every fact, with tabular numerals on anything
 * counted so digits do not jitter between renders.
 */

/**
 * `numerals.tabular` is declared `as const`, so its `fontVariant` is a readonly tuple and RN's
 * `TextStyle` wants a mutable array. Spread once here rather than reaching into the token file,
 * which is another session's and has to stay import-free anyway. Legacy hit this and solved it the
 * same way.
 */
const tabularNums: TextStyle = { fontVariant: [...numerals.tabular.fontVariant] };

export function NutritionHub({ hub, state }: { hub: Hub; state: HubState }) {
  const { colors } = useTheme();
  const router = useRouter();
  const [contributeNoted, setContributeNoted] = useState(false);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.headerSide}>
          <Link asChild href="/">
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={[styles.backText, { color: colors.textMuted }]}>← Home</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{hub.label}</Text>
        {/* Balances the link so the title centres against the screen, not against what is left. */}
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.observation, { color: colors.text }]}>{state.observation}</Text>
        <Text style={[styles.basis, { color: colors.textMuted }, tabularNums]}>{state.basis}</Text>

        <SectionLabel colors={colors} label="Coverage" />
        <View>
          {state.facets.map((facet, index) => (
            <View
              key={facet.label}
              style={[
                styles.facetRow,
                index > 0 && {
                  borderTopColor: colors.borderSubtle,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
              ]}>
              <FacetDot colors={colors} state={facet.state} />
              <Text style={[styles.facetLabel, { color: colors.text }]}>{facet.label}</Text>
              <Text
                numberOfLines={1}
                style={[styles.facetDetail, { color: colors.textMuted }, tabularNums]}>
                {facet.detail}
              </Text>
            </View>
          ))}
        </View>

        <SectionLabel colors={colors} label="Add to this" />
        <Pressable
          accessibilityRole="button"
          onPress={() => setContributeNoted(true)}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: colors.accent },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.primaryText, { color: colors.onAccent }]}>
            {state.contribute.primary}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setContributeNoted(true)}
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: colors.border },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.secondaryText, { color: colors.text }]}>
            {state.contribute.secondary}
          </Text>
        </Pressable>
        {contributeNoted && (
          <Text style={[styles.contributeNote, { color: colors.textMuted }]}>
            {state.contribute.note}
          </Text>
        )}

        <SectionLabel colors={colors} label="Take to the table" />
        <View>
          {state.threads.map((thread, index) => (
            <Pressable
              accessibilityRole="link"
              key={thread.id}
              // One chat surface, reached two ways. The Open Table opens it from the centre with
              // several hubs; a thread opens it from one hub with a subject already on it.
              onPress={() => router.push(`/table?domains=${hub.id}`)}
              style={({ pressed }) => [
                styles.threadRow,
                index > 0 && {
                  borderTopColor: colors.borderSubtle,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.threadLabel, { color: colors.text }]}>{thread.label}</Text>
              <Text style={[styles.threadChevron, { color: colors.textSubtle }]}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ colors, label }: { colors: ThemeColors; label: string }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{label.toUpperCase()}</Text>
  );
}

/**
 * State in one visual channel instead of a word per row: filled for what this hub reads itself,
 * muted for what it reads through another hub, hollow for what is not connected. Hollow is
 * deliberately not the warning colour — nothing is wrong with a facet the user has not set up.
 */
function FacetDot({ colors, state }: { colors: ThemeColors; state: FacetState }) {
  const fill = {
    elsewhere: colors.textSubtle,
    missing: 'transparent',
    reading: colors.accent,
  }[state];

  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: fill },
        state === 'missing' && { borderColor: colors.border, borderWidth: 1 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  back: {
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
  },
  backText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
  },
  /** The basis sits tight under the observation: one block, not two statements. */
  basis: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  body: {
    maxWidth: layout.maxWidth,
    paddingBottom: spacing.xxl,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing.lg,
    width: '100%',
  },
  contributeNote: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  dot: {
    borderRadius: 3,
    height: 6,
    marginRight: spacing.md,
    width: 6,
  },
  facetDetail: {
    flexShrink: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    textAlign: 'right',
  },
  facetLabel: {
    flexGrow: 1,
    fontFamily: fontFamily.medium,
    fontSize: typography.bodySmall,
    marginRight: spacing.md,
  },
  facetRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing.sm,
  },
  /**
   * Equal-weight slots either side of the title. Absolute positioning does not survive
   * `Link asChild`, which wraps the pressable on web — the link and the title rendered as
   * "← HomeNutrition". Two flex spacers centre the title without depending on that.
   */
  headerSide: {
    flex: 1,
  },
  /** The one interpretation on the screen, and the only serif. Everything below it is a fact. */
  observation: {
    fontFamily: fontFamily.serif,
    fontSize: typography.heroInterpretation,
    lineHeight: lineHeights.heroInterpretation,
  },
  pressed: {
    opacity: 0.75,
  },
  /** The single saturated accent. A hub has one primary way in, and this is Nutrition's. */
  primary: {
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryText: {
    fontFamily: fontFamily.semi,
    fontSize: typography.body,
  },
  screen: {
    flex: 1,
  },
  secondary: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.body,
  },
  sectionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wider,
    marginBottom: spacing.xs,
    marginTop: spacing.xl,
  },
  threadChevron: {
    fontSize: typography.subtitle,
    marginLeft: spacing.md,
  },
  threadLabel: {
    flexShrink: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.body,
    lineHeight: lineHeights.body,
  },
  threadRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: typography.subtitle,
  },
});

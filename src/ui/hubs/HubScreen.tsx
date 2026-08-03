import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';

import type { Coach, HubDefinition } from '@/ui/hubs/catalog';
import { childHubs } from '@/ui/hubs/catalog';
import type { CockpitPeriod, DayBar, FacetState, HubState } from '@/ui/hubs/hubState';
import {
  fontFamily,
  lineHeights,
  numerals,
  radius,
  spacing,
  tracking,
  typography,
  useTheme,
  type ThemeColors,
} from '@/ui/theme';

/**
 * A hub's own screen.
 *
 * Two doors, per `docs/decisions/0005-the-hub-model.md`: the coach, and the cockpit. They are not
 * two screens with a chooser between them — the cockpit IS this screen, and the coach sits at the
 * top of it as the one saturated element. A chooser would spend a whole screen and a tap asking a
 * question the user has already answered by opening the hub.
 *
 * Bands render only when the hub has them. Mind has no observation and no data, so it shows a coach,
 * a sentence saying nothing is connected, and its coverage. That is the honest screen for it, and
 * padding it would be the score page under another name.
 *
 * Paper and hairlines, not cards and shadows, carried over from Legacy's `NutritionHubScreen`.
 * Serif carries the one interpretation on the screen; sans carries every fact, with tabular numerals
 * on anything counted so digits do not jitter between renders.
 */

/**
 * `numerals.tabular` is declared `as const`, so its `fontVariant` is a readonly tuple and RN's
 * `TextStyle` wants a mutable array. Spread once here rather than reaching into the token file.
 */
const tabularNums: TextStyle = { fontVariant: [...numerals.tabular.fontVariant] };

export function HubScreen({
  coach,
  hub,
  state,
}: {
  coach: Coach | undefined;
  hub: HubDefinition;
  state: HubState;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const [contributeNoted, setContributeNoted] = useState(false);
  const inside = childHubs(hub.id);
  const contributeHref = state.contribute?.href;

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
        {/* Door one. The only saturated element on the screen, because it is the only thing here
            that answers back. */}
        {coach !== undefined && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/table?domains=${hub.id}`)}
            style={({ pressed }) => [
              styles.coach,
              { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.coachName, { color: colors.accent }]}>Ask the {coach.name}</Text>
            <Text style={[styles.coachFocus, { color: colors.textMuted }]}>{coach.focus}</Text>
          </Pressable>
        )}

        {state.observation !== undefined && (
          <Text style={[styles.observation, { color: colors.text }]}>{state.observation}</Text>
        )}
        {state.basis !== undefined && (
          <Text style={[styles.basis, { color: colors.textMuted }, tabularNums]}>{state.basis}</Text>
        )}

        {/* Door two, and it is the screen rather than a link to one. */}
        {state.cockpit.empty !== undefined ? (
          <>
            <SectionLabel colors={colors} label="Cockpit" />
            <Text style={[styles.empty, { color: colors.textMuted }]}>{state.cockpit.empty}</Text>
          </>
        ) : (
          state.cockpit.periods.map((period) => (
            <Period colors={colors} key={period.label} period={period} />
          ))
        )}

        {state.cockpit.week !== undefined && (
          <>
            <SectionLabel colors={colors} label="Last seven days" />
            <WeekStrip colors={colors} days={state.cockpit.week.days} />
            <Text style={[styles.caption, { color: colors.textMuted }]}>
              {state.cockpit.week.caption}
            </Text>
          </>
        )}

        {inside.length > 0 && (
          <>
            <SectionLabel colors={colors} label="Inside this hub" />
            <View style={styles.chips}>
              {inside.map((child) => (
                <Pressable
                  accessibilityRole="button"
                  key={child.id}
                  onPress={() => router.push(`/hub/${child.id}`)}
                  style={({ pressed }) => [
                    styles.chip,
                    { borderColor: colors.hairline },
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.chipText, { color: colors.text }]}>{child.label}</Text>
                </Pressable>
              ))}
              {/* Adding an exercise type is the same act as adding a hub, so it is the same flow
                  with a parent set. It sits with the types rather than in a menu, because this is
                  where someone notices theirs is missing. */}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ params: { parent: hub.id }, pathname: '/new-hub' })}
                style={({ pressed }) => [
                  styles.chip,
                  { borderColor: colors.accentBorder },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipText, { color: colors.accent }]}>+ Add</Text>
              </Pressable>
            </View>
          </>
        )}

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
              <Dot colors={colors} state={facet.state} />
              <Text style={[styles.facetLabel, { color: colors.text }]}>{facet.label}</Text>
              <Text
                numberOfLines={1}
                style={[styles.facetDetail, { color: colors.textMuted }, tabularNums]}>
                {facet.detail}
              </Text>
            </View>
          ))}
        </View>

        {state.contribute !== undefined && (
          <>
            <SectionLabel colors={colors} label="Add to this hub" />
            {/* A way in that leads somewhere navigates; one that does not says so rather than
                swallowing the tap. Most are still placeholders and should look like it. */}
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                contributeHref === undefined
                  ? setContributeNoted(true)
                  : router.push(contributeHref)
              }
              style={({ pressed }) => [
                styles.contribute,
                contributeHref === undefined
                  ? { borderColor: colors.hairline }
                  : { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.contributeText,
                  { color: contributeHref === undefined ? colors.text : colors.accent },
                ]}>
                {state.contribute.primary}
              </Text>
            </Pressable>
            {state.contribute.secondary !== undefined && (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  contributeHref === undefined
                    ? setContributeNoted(true)
                    : router.push(contributeHref)
                }
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <Text style={[styles.secondaryText, { color: colors.textMuted }]}>
                  {state.contribute.secondary}
                </Text>
              </Pressable>
            )}
            {contributeNoted && (
              <Text style={[styles.caption, { color: colors.textSubtle }]}>
                {state.contribute.note}
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Period({ colors, period }: { colors: ThemeColors; period: CockpitPeriod }) {
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

/**
 * Seven bars, no axis and no numbers. The strip is for rhythm and gaps, and a bar you could read an
 * exact value off would be making a claim the caption underneath already makes better.
 *
 * A day with nothing gets a visible floor rather than an absent bar, so seven days always read as
 * seven days. It does NOT distinguish "nothing recorded" from "recorded as none" — Sleep's blank
 * Friday is an unworn watch and Activity's is a real rest day, and `fill: 0` says the same thing for
 * both. The caption is what carries that difference, which is why every strip has one.
 */
function WeekStrip({ colors, days }: { colors: ThemeColors; days: readonly DayBar[] }) {
  return (
    <View style={styles.week}>
      {days.map((day, index) => (
        <View key={`${day.label}-${index}`} style={styles.weekDay}>
          <View style={[styles.weekTrack, { backgroundColor: colors.surfaceSoft }]}>
            <View
              style={[
                styles.weekFill,
                {
                  backgroundColor: day.fill > 0 ? colors.accent : colors.hairline,
                  height: day.fill > 0 ? `${Math.round(day.fill * 100)}%` : 2,
                },
              ]}
            />
          </View>
          <Text style={[styles.weekLabel, { color: colors.textSubtle }]}>{day.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Dot({ colors, state }: { colors: ThemeColors; state: FacetState }) {
  const style =
    state === 'reading'
      ? { backgroundColor: colors.accent }
      : state === 'elsewhere'
        ? { backgroundColor: colors.hairline }
        : { borderColor: colors.hairline, borderWidth: 1 };

  return <View style={[styles.dot, style]} />;
}

function SectionLabel({ colors, label }: { colors: ThemeColors; label: string }) {
  return <Text style={[styles.sectionLabel, { color: colors.textSubtle }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  back: {
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  backText: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
  },
  basis: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
  },
  body: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  caption: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  chip: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.caption,
  },
  coach: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  coachFocus: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    marginTop: 2,
  },
  coachName: {
    fontFamily: fontFamily.semi,
    fontSize: typography.body,
  },
  contribute: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  contributeText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodySmall,
  },
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
  dot: {
    borderRadius: 4,
    height: 8,
    marginRight: spacing.sm,
    width: 8,
  },
  empty: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
  },
  facetDetail: {
    flexShrink: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    textAlign: 'right',
  },
  facetLabel: {
    flexGrow: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    paddingRight: spacing.sm,
  },
  facetRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerSide: {
    flex: 1,
  },
  observation: {
    fontFamily: fontFamily.display,
    fontSize: typography.heroInterpretation,
    lineHeight: lineHeights.heroInterpretation,
  },
  pressed: {
    opacity: 0.7,
  },
  screen: {
    flex: 1,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
  },
  sectionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.semi,
    fontSize: typography.body,
  },
  week: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xs,
    height: 72,
  },
  weekDay: {
    alignItems: 'center',
    flex: 1,
  },
  weekFill: {
    borderRadius: 2,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  weekLabel: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: spacing.xs,
  },
  weekTrack: {
    borderRadius: 2,
    height: 52,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
});

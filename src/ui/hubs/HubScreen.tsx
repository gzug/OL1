import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { coachChat } from '@/application/chat/coachChat';
import { hubs } from '@/application/hubs/hubs';
import { toggleCoach } from '@/application/chat/threads';
import { holdForHandoff, toRef } from '@/application/chat/attachments';
import type { Attachment } from '@/core/attachments';
import { ChatBar } from '@/ui/chat/ChatBar';
import { RecentThreads } from '@/ui/chat/RecentThreads';
import { Heatmap } from '@/ui/exercise/Heatmap';
import { KidneyFunction } from '@/ui/labs/KidneyFunction';
import { PanelAge } from '@/ui/labs/PanelAge';
import { WhatChanged } from '@/ui/labs/WhatChanged';
import { YourMarkers } from '@/ui/labs/YourMarkers';
import { WeekScore } from '@/ui/meals/WeekScore';
import { LoggedWeek } from '@/ui/hubs/LoggedWeek';
import { StoredEntries } from '@/ui/hubs/StoredEntries';
import { useHubs } from '@/ui/hubs/useHubs';
import { CoachSelector } from '@/ui/chat/CoachSelector';
import { coachesAtTable } from '@/ui/chat/coachList';
import type { Coach, HubDefinition } from '@/ui/hubs/catalog';
import { childHubs } from '@/ui/hubs/catalog';
import { HideHub } from '@/ui/hubs/HideHub';
import { SAMPLE_DATA_LINE } from '@/ui/hubs/hubState';
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
 * two screens with a chooser between them — the cockpit IS this screen, and the coach is the chat
 * bar pinned under it. A chooser would spend a whole screen and a tap asking a question the user
 * already answered by opening the hub.
 *
 * The coach used to be a tinted card at the top. Two mockups were put side by side and the card
 * lost on three counts: the bar is where the input lives on Home, so there is nothing to learn; the
 * screen gets a whole data row shorter; and the coach moves from the top of a long scroll into
 * thumb reach. What the card did better was ASK — a chip names who is listening, it does not invite
 * anything — so the invitation moved into the bar's placeholder, which is the widest text in it.
 * That is the whole reason `ChatBar` takes a `placeholder` prop.
 *
 * The bar arrives already pointed at this hub's coach. Opening Sleep and typing reaches the Sleep
 * Coach without a selection step, which is the context a general bar here would have thrown away.
 *
 * Bands render only when the hub has them. A hub reading nothing shows its bar, one sentence saying
 * so, and its coverage — that is the honest screen for it, and padding it would be the score page
 * under another name. Labs proves the same in the other direction: no week strip at all, because a
 * panel arrives every few months and seven empty bars would be a worse lie than an absent section.
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

/**
 * What a hub's week is counted in.
 *
 * Per hub rather than per screen, because "4 of 7 days" means meals in Nutrition and sessions in
 * Exercise, and a hub with no kind listed has nothing weekly to say yet.
 */
const ENTRY_KIND: Readonly<Record<string, string>> = {
  exercise: 'session',
  labs: 'panel',
  nutrition: 'meal',
};

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
  /**
   * Every hub, hidden ones included, because the hide warning has to name the children that would
   * go with this one — and it must name them whether or not they are on the ring right now.
   */
  const { hubs: allHubs } = useHubs();
  const [entryCount, setEntryCount] = useState(0);
  const [contributeNoted, setContributeNoted] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const inside = childHubs(hub.id);
  const contributeHref = state.contribute?.href;

  /** This hub's coach, already at the table. A hub with no coach still gets the bar, unpointed. */
  const [selected, setSelected] = useState<readonly string[]>(
    coach === undefined ? [] : [coach.id],
  );
  const atTable = coachesAtTable(selected);

  async function send(text: string, attachment?: Attachment) {
    // Persist first, then navigate — same order as Home, and for the same reason: what was typed
    // reaches the conversation through the store rather than through a URL. An attachment's bytes
    // are not persisted at all, so they ride across the navigation in memory instead.
    if (attachment !== undefined) holdForHandoff(attachment);

    // Typing in the bar starts a new conversation, the same as it does on Home. The ones before it
    // are on the strip directly above, which is what makes starting a new one safe to do.
    const thread = await coachChat.start(selected);
    await coachChat.persist(
      thread,
      selected,
      text,
      attachment === undefined ? undefined : toRef(attachment),
    );
    setSelecting(false);
    router.push(`/table?coaches=${selected.join(',')}&thread=${thread}`);
  }

  /**
   * How much is in here, for the hide warning only. It says "the 14 things you logged are kept",
   * and a warning that cannot count is a warning that has to be vague about the one thing a person
   * is actually worried about.
   */
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void hubs
        .entries(hub.id)
        .then((found) => {
          if (!cancelled) setEntryCount(found.length);
        })
        .catch(() => {
          // A count that cannot be read stays 0, and the warning says "Nothing is deleted" — true
          // either way, and never a number this could not stand behind.
        });
      return () => {
        cancelled = true;
      };
    }, [hub.id]),
  );

  async function startFresh() {
    const thread = await coachChat.start(selected);
    router.push(`/table?coaches=${selected.join(',')}&thread=${thread}`);
  }

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
        {/* Real content, all of it, down to the SAMPLE_DATA_LINE below. */}
        <StoredEntries hubId={hub.id} />

        {/* The hub's own week, from what is stored. Renders nothing until something is logged, so a
            hub nobody has used is exactly as short as it was before. */}
        <LoggedWeek hubId={hub.id} kind={ENTRY_KIND[hub.id] ?? 'note'} />

        {/* Exercise only. Twelve weeks of squares answers "am I being consistent", which is a
            question about training and not about meals or blood panels — a panel arrives every few
            months and would draw eleven and a half empty weeks. */}
        {hub.id === 'exercise' && <Heatmap hubId={hub.id} />}

        {/* Nutrition only, and only once meals exist. The one score in the app — see
            `docs/decisions/0009-a-score-for-the-week-not-the-person.md`. */}
        {hub.id === 'nutrition' && <WeekScore />}

        {/* Labs only. How old the panel is comes before anything it says, because a number from a
            fourteen-month-old panel is not wrong — it is old, and a screen that omits the date
            invites it to be read as current. */}
        {hub.id === 'labs' && <PanelAge />}
        {hub.id === 'labs' && <KidneyFunction />}
        {hub.id === 'labs' && <YourMarkers />}
        {hub.id === 'labs' && <WhatChanged />}

        {/**
          * The boundary, and it is drawn here because here is where it is. Everything above is the
          * person's own; everything below is invented for layout review.
          *
          * It lived at the bottom of `StoredEntries` until real blocks started appearing beneath
          * that — the logged week, the panel's age, kidney function, the marker list — at which
          * point it was labelling real results as sample data. A boundary marker has to sit at the
          * boundary or it is worse than none: it teaches people to distrust the true half.
          */}
        <Text style={[styles.sampleLine, { color: colors.textSubtle }]}>{SAMPLE_DATA_LINE}</Text>

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

        {state.contribute !== undefined && (
          <>
            {/* Above coverage, not below it. On Labs the whole point of the hub is putting a
                panel in, and this sat last on a long scroll — the owner reported the button as
                missing, which is what "below the fold" looks like from outside. */}
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


        {/* Last on the screen, under the fixtures. Putting a hub away is a rare, considered act;

            putting it in the header would make it the second most prominent thing on a hub. */}

        <HideHub entryCount={entryCount} hub={hub} hubs={allHubs} />


      </ScrollView>

      {selecting && (
        <CoachSelector
          onClose={() => setSelecting(false)}
          onToggle={(coachId) => setSelected((current) => toggleCoach(current, coachId))}
          selected={selected}
        />
      )}

      {/* Above the bar, not inside the scroll: the coach lives in the bar, so the conversations you
          have had with it belong beside the bar and stay visible however long the cockpit gets. */}
      {coach !== undefined && (
        <RecentThreads
          coachId={coach.id}
          onNew={() => void startFresh()}
          onOpen={(thread, ids) =>
            router.push(`/table?coaches=${ids.join(',')}&thread=${thread}`)
          }
        />
      )}

      <View style={styles.barSlot}>
        <ChatBar
          coachNames={atTable.map((entry) => entry.name)}
          onOpenSelector={() => setSelecting((open) => !open)}
          onSend={(text, attachment) => void send(text, attachment)}
          // Names the SUBJECT, not the coach — the chip beside it already names the coach, and
          // "Sleep Coach · Ask the Sleep Coach…" said it twice in one bar. Caught on the rendered
          // screen; it reads fine in a mockup and badly at actual size.
          placeholder={coach === undefined ? 'Message' : `Ask about ${hub.label.toLowerCase()}…`}
        />
      </View>
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
 * Friday is an unworn watch and Exercise's is a real rest day, and `fill: 0` says the same thing for
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
  barSlot: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
  sampleLine: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
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

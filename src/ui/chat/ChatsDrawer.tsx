import { useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { coachChat } from '@/application/chat/coachChat';
import { historyEntries, type HistoryEntry } from '@/application/chat/history';
import { sportCoachesFor } from '@/application/exercise/sportCoaches';
import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { hubCoaches, nestedCoaches, sportCoaches } from '@/ui/chat/coachList';
import type { Coach } from '@/ui/hubs/catalog';
import {
  fontFamily,
  lineHeights,
  spacing,
  tracking,
  typography,
  useTheme,
} from '@/ui/theme';

/**
 * Every conversation in one place, and nothing else.
 *
 * **The ring is the map; this is for conversations and settings** — the owner's decision on
 * 2026-08-21, taken against the alternative of listing hubs here too. Hubs are not in this drawer,
 * deliberately: a conventional menu offering a second route to every hub would win over the ring,
 * and the ring is the product idea rather than decoration around it.
 *
 * Opened by the word **Chats**, not by three lines. A hamburger says "app with a menu"; a quiet word
 * in the same type as "Digital Twin" says what is behind it and leaves the ring the loudest thing on
 * the screen.
 *
 * Order is an argument. You mostly want to start something rather than resume something, so the
 * coaches come first and Recent is last — the opposite of Claude, which puts chats first because
 * chats are all it has.
 */

/** Enough recent conversations to be useful, few enough to stay under the fold. */
const RECENT = 4;

export function ChatsDrawer({
  onClose,
  source = defaultHubs,
}: {
  onClose: () => void;
  source?: typeof defaultHubs;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const [recent, setRecent] = useState<readonly HistoryEntry[] | null>(null);
  const [named, setNamed] = useState<readonly string[] | null>(null);
  const [open, setOpen] = useState<'coaches' | 'sports' | null>('coaches');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        const [threads, entries] = await Promise.all([
          coachChat.listThreads(),
          source.entries('exercise'),
        ]);
        if (cancelled) return;

        setRecent(historyEntries(threads, [...hubCoaches(), ...nestedCoaches(), ...sportCoaches()]));
        setNamed(sportCoachesFor(entries).map((sport) => sport.coachId));
      })().catch(() => {
        /* A store that will not read shows no list rather than an empty one. "You have had no
           conversations" is a claim about a person, and a failed read must never make it. */
      });

      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  function go(path: string) {
    onClose();
    router.push(path);
  }

  /**
   * Named sports first, then the rest under "Also available".
   *
   * The owner's call, and the case that decides it is the Strava import: it brings in swims from
   * somebody who never ticked Swimming, so the coach they would want is one they never named.
   * Hiding it until they say so would be the app knowing something and withholding it.
   */
  const sports = sportCoaches();
  const mine = named === null ? [] : sports.filter((coach) => named.includes(coach.id));
  const rest = named === null ? sports : sports.filter((coach) => !named.includes(coach.id));

  return (
    <View style={[styles.drawer, { backgroundColor: colors.surface }]}>
      <View style={styles.top}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Chats</Text>
        <View style={styles.closeBalance} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Nobody in it. Genuinely a different room from the Round Table, which is where several
            coaches are picked — the owner settled that on 2026-08-21. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => go('/table')}
          style={({ pressed }) => [styles.row, styles.first, pressed && styles.pressed]}>
          <View style={styles.rowText}>
            <Text style={[styles.name, { color: colors.accent }]}>New chat</Text>
            <Text style={[styles.sub, { color: colors.textSubtle }]}>Nobody in it yet</Text>
          </View>
          <Text style={[styles.chev, { color: colors.textSubtle }]}>›</Text>
        </Pressable>

        <Section
          colors={colors}
          count={hubCoaches().length + nestedCoaches().length}
          label="Coaches"
          onToggle={() => setOpen((current) => (current === 'coaches' ? null : 'coaches'))}
          open={open === 'coaches'}
        />
        {open === 'coaches' &&
          [...hubCoaches(), ...nestedCoaches()].map((coach) => (
            <CoachRow coach={coach} colors={colors} key={coach.id} onPress={go} />
          ))}

        <Section
          colors={colors}
          count={sports.length}
          label="Sport coaches"
          onToggle={() => setOpen((current) => (current === 'sports' ? null : 'sports'))}
          open={open === 'sports'}
        />
        {open === 'sports' && (
          <>
            {mine.map((coach) => (
              <CoachRow coach={coach} colors={colors} key={coach.id} onPress={go} />
            ))}
            {rest.length > 0 && mine.length > 0 && (
              <Text style={[styles.also, { color: colors.textSubtle }]}>ALSO AVAILABLE</Text>
            )}
            {rest.map((coach) => (
              <CoachRow coach={coach} colors={colors} key={coach.id} onPress={go} quiet />
            ))}
          </>
        )}

        <Text style={[styles.head, { color: colors.textSubtle }]}>ROUND TABLE</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => go('/table?pick=1')}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={styles.rowText}>
            <Text style={[styles.name, { color: colors.accent }]}>Ask several at once</Text>
            <Text style={[styles.sub, { color: colors.textSubtle }]}>Pick who sits down</Text>
          </View>
          <Text style={[styles.chev, { color: colors.textSubtle }]}>›</Text>
        </Pressable>

        {/* Nothing at all until a read succeeds. `null` is "not looked yet"; an empty array is
            "looked, and there are none" — and only the second may say so. */}
        {recent !== null && recent.length > 0 && (
          <>
            <Text style={[styles.head, { color: colors.textSubtle }]}>RECENT</Text>
            {recent.slice(0, RECENT).map((entry) => (
              <Pressable
                accessibilityRole="button"
                key={entry.id}
                onPress={() => go(`/table?coaches=${entry.coachIds.join(',')}&thread=${entry.id}`)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: colors.text }]}>{entry.title}</Text>
                  <Text numberOfLines={1} style={[styles.sub, { color: colors.textSubtle }]}>
                    {entry.preview}
                  </Text>
                </View>
              </Pressable>
            ))}
            {recent.length > RECENT && (
              <Text style={[styles.more, { color: colors.textSubtle }]}>
                {recent.length - RECENT} more, and a screen for all of them is not built yet.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/**
       * The foot. Settings joins this the moment `/settings` exists — it is being built in another
       * session, and linking a route that is not there yet would be the app claiming a screen it
       * does not have.
       */}
      <View style={[styles.foot, { borderTopColor: colors.hairline }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => go('/welcome')}
          style={({ pressed }) => [styles.footRow, pressed && styles.pressed]}>
          <Text style={[styles.footText, { color: colors.textMuted }]}>Show the first run</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Section({
  colors,
  count,
  label,
  onToggle,
  open,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  count: number;
  label: string;
  onToggle: () => void;
  open: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onToggle}
      style={({ pressed }) => [styles.section, pressed && styles.pressed]}>
      <Text style={[styles.head, styles.sectionHead, { color: colors.textSubtle }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.arrow, { color: colors.textSubtle }]}>
        {open ? '⌃' : `⌄  ${count}`}
      </Text>
    </Pressable>
  );
}

function CoachRow({
  coach,
  colors,
  onPress,
  quiet = false,
}: {
  coach: Coach;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: (path: string) => void;
  /** A sport nobody named. Offered, and visibly not one of theirs. */
  quiet?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(`/table?coaches=${coach.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: quiet ? colors.textMuted : colors.text }]}>
          {coach.name}
        </Text>
      </View>
      <Text style={[styles.chev, { color: colors.textSubtle }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  also: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  arrow: { fontFamily: fontFamily.body, fontSize: typography.caption },
  body: { paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  chev: { fontFamily: fontFamily.body, fontSize: typography.bodySmall },
  close: { minWidth: 40, paddingVertical: spacing.xs },
  closeBalance: { minWidth: 40 },
  closeText: { fontFamily: fontFamily.body, fontSize: typography.subtitle },
  drawer: { flex: 1 },
  first: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  foot: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg },
  footRow: { paddingVertical: spacing.md },
  footText: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  head: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  more: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  name: { fontFamily: fontFamily.body, fontSize: typography.body },
  pressed: { opacity: 0.6 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowText: { flexShrink: 1 },
  section: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  sectionHead: { marginTop: spacing.lg },
  sub: { fontFamily: fontFamily.body, fontSize: typography.caption, marginTop: 1 },
  title: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});

import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  fontFamily,
  lineHeights,
  radius,
  spacing,
  tracking,
  typography,
  useTheme,
} from '@/ui/theme';

import { BackIcon } from './icons';
import { COPY } from './rows';

/**
 * The frame every settings screen is built in.
 *
 * Twelve screens repeating a header, a back button and a row would be twelve chances for one of
 * them to keep an old spacing — the same argument `MockupScreen` makes about the safe-area wrapper.
 *
 * **The row treatment is the owner's**, from the ChatGPT settings screens he sent on 2026-08-21:
 * each row is its own rounded rectangle with a small gap, an icon on the left, and the current value
 * as a second line rather than hidden behind a tap. One thing is inverted: his reference puts grey
 * rows on white, and this puts white rows on One L1fe's warm paper. Same relationship — the row
 * lifts off the ground — in this app's own colours rather than borrowed ones.
 *
 * **There is no chevron on a row that opens a screen.** The reference has none either, and the
 * second line does that job better: a row saying *6 on your ring · 1 put away* is obviously a way in.
 * A chevron is kept for the one case it earns, which is a value that expands where it stands.
 */

export function Screen({ children, title }: { children: ReactNode; title: string }) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}>
          <BackIcon size={19} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
        {/**
          * Empty on purpose. It balances the back button so the title sits centred, and putting a
          * transparent copy of the button here instead would read the word "Back" out loud a second
          * time to anybody using a screen reader.
          */}
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function Group({ children, label }: { children: ReactNode; label: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: colors.textSubtle }]}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * One row on the index: an icon, a name, what it currently says, and whether it leads anywhere yet.
 *
 * `under` is null while the store has not answered, and the second line simply does not render.
 * That is the whole of shape 1 of `docs/decisions/0013` at this level — a row that printed
 * *Nothing given yet* before anything was read would be telling somebody about their own data from
 * a value that only means "nobody has looked".
 */
export function Row({
  icon,
  label,
  onPress,
  under,
  waiting = false,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  under?: string | null;
  waiting?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}>
      {icon}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: waiting ? colors.textMuted : colors.text }]}>
          {label}
        </Text>
        {under !== null && under !== undefined && (
          <Text numberOfLines={1} style={[styles.rowUnder, { color: colors.textSubtle }]}>
            {under}
          </Text>
        )}
      </View>
      {waiting && (
        <View style={[styles.badge, { backgroundColor: colors.surfaceSoft }]}>
          <Text style={[styles.badgeText, { color: colors.textSubtle }]}>{COPY.waitingBadge}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * A row inside a detail screen: the thing on the left, what is true of it on the right.
 *
 * **The label carries the weight, not the value.** It read the other way first — a coach called
 * *Exercise Coach* in grey beside its hub *Exercise* in near-black, so the secondary fact was the
 * loudest thing on the row. Every use here puts the subject in `label`: a coach, a goal, a hub. The
 * value is what qualifies it.
 */
export function Line({
  action,
  label,
  onPress,
  value,
}: {
  action?: string;
  label: string;
  onPress?: () => void;
  value?: string;
}) {
  const { colors } = useTheme();

  const body = (
    <View style={[styles.line, { backgroundColor: colors.surface }]}>
      <Text style={[styles.lineLabel, { color: colors.text }]}>{label}</Text>
      {value !== undefined && (
        <Text style={[styles.lineValue, { color: colors.textSubtle }]}>{value}</Text>
      )}
      {action !== undefined && (
        <Text style={[styles.lineAction, { color: colors.accent }]}>{action}</Text>
      )}
    </View>
  );

  if (onPress === undefined) return body;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

export function Label({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.textSubtle }]}>{text}</Text>;
}

export function Note({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.note, { color: colors.textSubtle }]}>{text}</Text>;
}

export function Problem({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.problem, { color: colors.warning }]}>{text}</Text>;
}

/**
 * What a row that is waiting on something opens.
 *
 * One card, one honest sentence, and no controls — because there is nothing to control. It exists so
 * that a person tapping *Subscription* finds out why there is nothing there, rather than a dead row
 * or a screen that looks broken.
 */
export function Waiting({ icon, text, title }: { icon: ReactNode; text: string; title: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.waiting, { backgroundColor: colors.surface }]}>
      {icon}
      <Text style={[styles.waitingTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.waitingText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  badge: { borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: {
    fontFamily: fontFamily.semi,
    fontSize: 10,
    letterSpacing: tracking.wide,
  },
  body: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  group: { marginTop: spacing.lg },
  groupLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodySmall,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xs,
    marginLeft: 2,
    marginTop: spacing.lg,
  },
  line: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  lineAction: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  lineLabel: { flexShrink: 1, fontFamily: fontFamily.body, fontSize: typography.bodySmall },
  lineValue: { fontFamily: fontFamily.body, fontSize: typography.caption, textAlign: 'right' },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginLeft: 2,
    marginTop: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  problem: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    marginLeft: 2,
    marginTop: spacing.xs,
  },
  row: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: 5,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowLabel: { fontFamily: fontFamily.body, fontSize: typography.body },
  rowText: { flex: 1, minWidth: 0 },
  rowUnder: { fontFamily: fontFamily.body, fontSize: typography.micro, marginTop: 1 },
  screen: { flex: 1 },
  title: { flex: 1, fontFamily: fontFamily.medium, fontSize: typography.body, textAlign: 'center' },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  waiting: {
    alignItems: 'center',
    borderRadius: radius.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  waitingText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    textAlign: 'center',
  },
  waitingTitle: {
    fontFamily: fontFamily.serif,
    fontSize: typography.subtitle,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

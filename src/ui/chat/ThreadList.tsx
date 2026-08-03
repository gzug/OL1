import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { coachChat } from '@/application/chat/coachChat';
import { historyEntries, type HistoryEntry } from '@/application/chat/history';
import { selectableCoaches } from '@/ui/chat/coachList';
import {
  fontFamily,
  lineHeights,
  radius,
  spacing,
  tracking,
  typography,
  useTheme,
} from '@/ui/theme';

/**
 * Earlier conversations.
 *
 * The same sheet shape as `CoachSelector` on purpose — both answer "which conversation am I in",
 * and giving them two different presentations would make that look like two different questions.
 *
 * Reopening does not create anything. A thread id is derived from its coaches, so picking a row is
 * the same act as picking those coaches in the bar; the conversation was always going to be there.
 */

export function ThreadList({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (coachIds: readonly string[]) => void;
}) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<readonly HistoryEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void coachChat.listThreads().then((threads) => {
      if (!cancelled) setEntries(historyEntries(threads, selectableCoaches()));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={[styles.sheet, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSubtle }]}>EARLIER CONVERSATIONS</Text>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Text style={[styles.closeText, { color: colors.textMuted }]}>Done</Text>
        </Pressable>
      </View>

      {/* Three states, and none of them is a blank sheet: still reading, nothing yet, or the list. */}
      {entries === null ? (
        <Text style={[styles.empty, { color: colors.textSubtle }]}>Looking…</Text>
      ) : entries.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSubtle }]}>
          Nothing yet. Anything you ask from the bar shows up here.
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
          {entries.map((entry, index) => (
            <Pressable
              accessibilityRole="button"
              key={entry.id}
              onPress={() => onOpen(entry.coachIds)}
              style={({ pressed }) => [
                styles.row,
                index > 0 && {
                  borderTopColor: colors.borderSubtle,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.rowTitle, { color: colors.accent }]}>{entry.title}</Text>
              <Text numberOfLines={1} style={[styles.rowPreview, { color: colors.text }]}>
                {entry.preview}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  close: {
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  closeText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.caption,
  },
  empty: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  list: {
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    paddingVertical: spacing.md,
  },
  rowPreview: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    marginTop: 2,
  },
  rowTitle: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    /** Same ceiling as the coach sheet, so the two never sit at different heights over the orbit. */
    maxHeight: 470,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
  },
});

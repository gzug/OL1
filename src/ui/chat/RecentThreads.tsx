import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { coachChat } from '@/application/chat/coachChat';
import { shortPreview } from '@/application/chat/history';
import { recentFor } from '@/application/chat/threads';
import type { ChatThreadSummary } from '@/core/chat';
import { fontFamily, radius, spacing, typography, useTheme } from '@/ui/theme';

/**
 * The last three conversations you had with this coach, on the coach's own hub.
 *
 * The owner asked for this in the same breath as the store, and named the model himself: *"you can
 * always jump back into previous chats with the coaches... it should always show you the last three
 * conversations so you can jump right into a previous conversation. Similar to how it is here in
 * Claude."*
 *
 * **Why a strip above the bar rather than a list at the top of the screen.** "Always show" rules out
 * hiding it in a sheet, and a hub's own data has first claim on the top of its screen. The coach
 * lives in the bar at the bottom, so its recent conversations belong beside it — and pinned there,
 * they stay visible however long the cockpit gets.
 *
 * **Three is the number he asked for**, and it is also about what fits before a row of pills stops
 * being scannable. The rule for WHICH three is deliberately loose (`recentFor`): a conversation
 * where this coach sat with two others still counts, because from the hub's side it is one you had
 * with them.
 *
 * A hub you have never asked about renders nothing at all. An empty state here would be a permanent
 * strip saying "no conversations yet" above a bar that already invites one.
 */
export function RecentThreads({
  coachId,
  onNew,
  onOpen,
}: {
  coachId: string;
  onNew: () => void;
  onOpen: (threadId: string, coachIds: readonly string[]) => void;
}) {
  const { colors } = useTheme();
  const [threads, setThreads] = useState<readonly ChatThreadSummary[]>([]);

  // On focus, not just on mount: you leave this screen to have the conversation and come back to it.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void coachChat
        .listThreads()
        .then((all) => {
          if (cancelled) return;
          // A thread with no question in it has nothing to show on a pill and nothing to return to.
          setThreads(recentFor(all, coachId).filter((thread) => thread.preview.length > 0));
        })
        .catch(() => {
          // A history that cannot be read shows no history. It must never take the hub down with it.
        });

      return () => {
        cancelled = true;
      };
    }, [coachId]),
  );

  if (threads.length === 0) return null;

  return (
    <View style={styles.strip}>
      <ScrollView
        contentContainerStyle={styles.row}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {threads.map((thread) => (
          <Pressable
            accessibilityRole="button"
            key={thread.id}
            onPress={() => onOpen(thread.id, thread.coachIds)}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: colors.surface, borderColor: colors.hairline },
              pressed && styles.pressed,
            ]}>
            <Text numberOfLines={1} style={[styles.pillText, { color: colors.text }]}>
              {shortPreview(thread.preview, 28)}
            </Text>
          </Pressable>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={onNew}
          style={({ pressed }) => [
            styles.pill,
            { borderColor: colors.accentBorder },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.pillText, { color: colors.accent }]}>+ New</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 200,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  strip: {
    paddingBottom: spacing.xs,
  },
});

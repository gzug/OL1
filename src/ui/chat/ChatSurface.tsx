import { Link, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { describe } from '@/application/chat/attachments';
import { splitCoachVoices, type Voice } from '@/application/chat/prompt';
import { toggleCoach } from '@/application/chat/threads';
import type { ChatTurn } from '@/core/chat';
import {
  fontFamily,
  lineHeights,
  radius,
  spacing,
  typography,
  useTheme,
  type ThemeColors,
} from '@/ui/theme';

import { ChatBar } from './ChatBar';
import { CoachSelector } from './CoachSelector';
import { ThreadList } from './ThreadList';
import { coachesAtTable } from './coachList';
import { isPending } from './chatTurns';
import { unavailableMessage } from './messages';
import { useCoachChat } from './useCoachChat';

/**
 * The conversation.
 *
 * Shape follows what the owner asked for — "the same way as Claude or ChatGPT": the person's own
 * messages sit in a bubble, the answer does not. An answer set in a bubble reads as a quote from
 * somewhere else; set on the paper it reads as the app talking, which is what it is.
 *
 * A round table is split back into its voices by `splitCoachVoices`, so several coaches read as
 * several coaches rather than as one long paragraph with names in it.
 */

type Sheet = 'coaches' | 'history' | null;

const ATTACHMENT_LABEL = {
  audio: 'Voice note',
  document: 'File',
  image: 'Photo',
  video: 'Video',
} as const;

export function ChatSurface({ coachIds }: { coachIds: readonly string[] }) {
  const { colors } = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState<readonly string[]>(coachIds);
  /** One sheet at a time. Two booleans could both be true; this cannot. */
  const [sheet, setSheet] = useState<Sheet>(null);
  const scroller = useRef<ScrollView>(null);

  const coaches = useMemo(() => coachesAtTable(selected), [selected]);
  const { problem, send, status, turns } = useCoachChat(coaches);

  function choose(coachId: string) {
    const next = toggleCoach(selected, coachId);
    setSelected(next);
    // The route says which conversation this is, so it has to keep up. `setParams` rather than
    // `push`: changing who is at the table is not a new screen to go back from.
    router.setParams({ coaches: next.join(',') });
  }

  function reopen(ids: readonly string[]) {
    setSheet(null);
    setSelected(ids);
    router.setParams({ coaches: ids.join(',') });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Link asChild href="/">
          <Pressable
            accessibilityRole="link"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={[styles.backText, { color: colors.textMuted }]}>← Home</Text>
          </Pressable>
        </Link>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {coaches.length === 0 ? 'Assistant' : coaches.map((coach) => coach.name).join(', ')}
        </Text>
        <Pressable
          accessibilityLabel="Earlier conversations"
          accessibilityRole="button"
          onPress={() => setSheet((open) => (open === 'history' ? null : 'history'))}
          style={({ pressed }) => [styles.history, pressed && styles.pressed]}>
          <Text style={[styles.historyText, { color: colors.textMuted }]}>Earlier</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.transcript}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        ref={scroller}
        showsVerticalScrollIndicator={false}>
        {turns.length === 0 && status !== 'loading' && (
          <Text style={[styles.empty, { color: colors.textSubtle }]}>
            {coaches.length === 0
              ? 'Ask anything. Add coaches from the bar when a question belongs to one of them.'
              : 'Ask them anything inside what they cover.'}
          </Text>
        )}

        {turns.map((turn) => (
          <Turn colors={colors} coachNames={coaches} key={turn.id} turn={turn} />
        ))}

        {problem !== null && (
          <Text style={[styles.problem, { color: colors.textMuted }]}>
            {unavailableMessage(problem)}
          </Text>
        )}
      </ScrollView>

      {sheet !== null && (
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={() => setSheet(null)}
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
        />
      )}

      <View style={styles.bottom}>
        {sheet === 'coaches' && (
          <CoachSelector onClose={() => setSheet(null)} onToggle={choose} selected={selected} />
        )}
        {sheet === 'history' && <ThreadList onClose={() => setSheet(null)} onOpen={reopen} />}
        <View style={styles.barSlot}>
          <ChatBar
            coachNames={coaches.map((coach) => coach.name)}
            generating={status === 'generating'}
            onOpenSelector={() => setSheet((open) => (open === 'coaches' ? null : 'coaches'))}
            onSend={(text, attachment) => void send(text, attachment)}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Turn({
  coachNames,
  colors,
  turn,
}: {
  coachNames: readonly { focus: string; id: string; name: string }[];
  colors: ThemeColors;
  turn: ChatTurn;
}) {
  if (turn.role === 'user') {
    return (
      <View style={[styles.mine, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* What was attached, never the thing itself: the bytes are not kept, so a thumbnail here
            would be a promise the store cannot honour on the next open. */}
        {turn.attachment !== undefined && (
          <Text style={[styles.attached, { color: colors.accent }]}>
            {ATTACHMENT_LABEL[turn.attachment.kind]} · {describe(turn.attachment)}
          </Text>
        )}
        {turn.text.length > 0 && (
          <Text style={[styles.mineText, { color: colors.text }]}>{turn.text}</Text>
        )}
      </View>
    );
  }

  if (isPending(turn)) {
    return <Text style={[styles.thinking, { color: colors.textSubtle }]}>Thinking…</Text>;
  }

  const voices: readonly Voice[] =
    coachNames.length > 1 ? splitCoachVoices(turn.text, coachNames) : [{ text: turn.text }];

  return (
    <View style={styles.answer}>
      {voices.map((voice, index) => (
        <View key={`${voice.speaker ?? 'voice'}-${index}`} style={index > 0 && styles.voiceGap}>
          {voice.speaker !== undefined && (
            <Text style={[styles.speaker, { color: colors.accent }]}>{voice.speaker}</Text>
          )}
          <Text style={[styles.answerText, { color: colors.text }]}>{voice.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  answer: {
    paddingRight: spacing.lg,
  },
  attached: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    marginBottom: 3,
  },
  answerText: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.body,
  },
  back: {
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  backText: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
  },
  barSlot: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  bottom: {
    zIndex: 2,
  },
  empty: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    paddingTop: spacing.xl,
    textAlign: 'center',
  },
  history: {
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  historyText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    /**
     * A gap, not padding on the link. `Link asChild` puts the anchor between this row and the
     * Pressable, and the Pressable's own `paddingRight` did not survive that trip — the back link
     * and the title rendered flush against each other as "← HomeActivity Coach".
     */
    gap: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  mine: {
    alignSelf: 'flex-end',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '84%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mineText: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
  },
  pressed: {
    opacity: 0.7,
  },
  problem: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
  },
  screen: {
    flex: 1,
  },
  scrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  speaker: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    marginBottom: 2,
  },
  thinking: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.semi,
    fontSize: typography.bodySmall,
  },
  transcript: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  voiceGap: {
    marginTop: spacing.md,
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { selectionLabel } from '@/application/chat/threads';
import { fontFamily, radius, spacing, typography, useTheme } from '@/ui/theme';

/**
 * The chat bar.
 *
 * One component, two mount points — the bottom of Home, and under the transcript on the chat
 * screen. That is what "one chat surface reached two ways" means in code: not two screens kept in
 * sync, one component rendered twice.
 *
 * Layout ported from Legacy `screens/llm/ChatScreen.tsx` lines 810-900 — `returnKeyType="send"`,
 * `blurOnSubmit={false}` so the keyboard survives a send, and the send control swapping for a stop
 * control while generating.
 *
 * There is no icon library in this repository and none is added for three glyphs. `+` and `↑` are
 * type; the microphone is drawn from two Views, the same way `geometry.ts` draws the orbit's spokes
 * rather than reaching for SVG.
 */

export function ChatBar({
  attachmentsNote,
  coachNames,
  disabled = false,
  generating = false,
  onOpenSelector,
  onSend,
  onStop,
  placeholder = 'Message',
}: {
  /** Shown when `+` or the microphone is tapped, until part C wires them. */
  attachmentsNote?: string;
  coachNames: readonly string[];
  disabled?: boolean;
  generating?: boolean;
  onOpenSelector: () => void;
  onSend: (text: string) => void;
  onStop?: () => void;
  /**
   * The invitation, not the label. On Home "Message" is right, because the bar is already the
   * obvious thing to type in. On a hub it replaced a card that said "Ask the Sleep Coach", and the
   * chip alone could not carry that job — a chip names who is listening, it does not ask anything.
   * Putting the invitation in the widest text in the bar is what let the card go.
   */
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const ready = text.trim().length > 0 && !disabled;

  function send() {
    if (!ready) return;
    onSend(text);
    setText('');
  }

  function showNote() {
    if (attachmentsNote !== undefined) setNote(attachmentsNote);
  }

  return (
    <View style={styles.wrapper}>
      {note !== null && (
        <Text style={[styles.note, { color: colors.textSubtle }]} onPress={() => setNote(null)}>
          {note}
        </Text>
      )}

      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        <Pressable
          accessibilityLabel="Choose coaches"
          accessibilityRole="button"
          onPress={onOpenSelector}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
          <Text
            numberOfLines={1}
            style={[
              styles.chipText,
              { color: coachNames.length === 0 ? colors.textMuted : colors.accent },
            ]}>
            {selectionLabel(coachNames)} ⌄
          </Text>
        </Pressable>

        <TextInput
          blurOnSubmit={false}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          returnKeyType="send"
          style={[styles.input, { color: colors.text }]}
          value={text}
        />

        <Pressable
          accessibilityLabel="Attach a photo, video or file"
          accessibilityRole="button"
          onPress={showNote}
          style={({ pressed }) => [styles.glyphButton, pressed && styles.pressed]}>
          <Text style={[styles.glyph, { color: colors.textMuted }]}>+</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Record a voice note"
          accessibilityRole="button"
          onPress={showNote}
          style={({ pressed }) => [styles.glyphButton, pressed && styles.pressed]}>
          {/* A hollow capsule over a bar reads as a zero with an underline — caught on the
              rendered screen, which is the only place it was ever going to show. Filled head,
              thin stem, narrow base: three parts, and it reads as a microphone at 18px. */}
          <View style={styles.mic}>
            <View style={[styles.micHead, { backgroundColor: colors.textMuted }]} />
            <View style={[styles.micStem, { backgroundColor: colors.textMuted }]} />
            <View style={[styles.micBase, { backgroundColor: colors.textMuted }]} />
          </View>
        </Pressable>

        {generating && onStop !== undefined ? (
          <Pressable
            accessibilityLabel="Stop"
            accessibilityRole="button"
            onPress={onStop}
            style={[styles.action, { backgroundColor: colors.danger }]}>
            <View style={[styles.stop, { backgroundColor: colors.onAccent }]} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel="Send"
            accessibilityRole="button"
            disabled={!ready}
            onPress={send}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: ready ? colors.accent : colors.surfaceSoft },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.send, { color: ready ? colors.onAccent : colors.textSubtle }]}>
              ↑
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  bar: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: 5,
    paddingVertical: 5,
  },
  chip: {
    /** Wide enough for the longest single coach name in the catalog, and no wider. */
    maxWidth: 124,
    paddingVertical: spacing.sm,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
  },
  glyph: {
    fontFamily: fontFamily.body,
    fontSize: 19,
    lineHeight: 22,
  },
  glyphButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    // Height is fixed rather than intrinsic: an input that grows with its content moves the whole
    // orbit up as you type, which reads as the screen flinching.
    height: 32,
    minWidth: 0,
    paddingVertical: 0,
  },
  mic: {
    alignItems: 'center',
    height: 17,
    width: 12,
  },
  micBase: {
    borderRadius: 1,
    height: 1.5,
    marginTop: 1,
    width: 9,
  },
  micHead: {
    borderRadius: 3,
    height: 10,
    width: 6,
  },
  micStem: {
    height: 3,
    marginTop: 1,
    width: 1.5,
  },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  send: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 19,
  },
  stop: {
    borderRadius: 2,
    height: 10,
    width: 10,
  },
  wrapper: {
    width: '100%',
  },
});

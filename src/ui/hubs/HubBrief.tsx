import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { Coach } from '@/ui/hubs/catalog';
import { fontFamily, lineHeights, radius, spacing, tracking, typography, useTheme } from '@/ui/theme';

/**
 * How you want to be coached in this hub, in your own words.
 *
 * The owner's example, 2026-08-21: a Longevity hub where he writes *"coach me based on the book
 * Outlive"*, and from then on that hub's coach answers in that frame without being told again.
 *
 * **It is a frame, not a file.** What goes in here shapes how a coach answers; it is not a record of
 * the person and nothing reads it back as one. `briefSection` in `application/chat/prompt.ts` is
 * where that boundary is actually enforced — the brief reaches the model fenced, as reported
 * speech, told to be the only thing known and not to be extended into ages, history or conditions
 * nobody wrote.
 *
 * **Saved on blur, not by a button.** A brief is a sentence somebody edits and re-edits, and a save
 * button on a text box is a way to lose what was typed. Empty clears it.
 */
export function HubBrief({
  coach,
  hubId,
  source = defaultHubs,
}: {
  coach: Coach | undefined;
  hubId: string;
  source?: typeof defaultHubs;
}) {
  const { colors } = useTheme();
  const [brief, setBrief] = useState('');
  const [open, setOpen] = useState(false);
  /** `null` until the store has answered. Nothing is claimed about a brief before it is read. */
  const [saved, setSaved] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void source
        .brief(hubId)
        .then((found) => {
          if (cancelled) return;
          setSaved(found ?? '');
          setBrief(found ?? '');
        })
        .catch(() => {
          // Unread stays unread. An empty box that means "could not read" would invite somebody to
          // type their brief a second time over one that is already there.
        });
      return () => {
        cancelled = true;
      };
    }, [hubId, source]),
  );

  if (saved === null) return null;

  async function keep() {
    if (brief.trim() === saved?.trim()) return;
    try {
      await source.setBrief(hubId, brief);
      setSaved(brief.trim());
    } catch {
      // The text stays on screen. Losing what somebody typed to a failed write is the worst
      // outcome available here, and it is worse than a save that quietly did not happen.
    }
  }

  const who = coach?.name ?? 'this hub’s coach';

  if (!open && saved.length === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.invite, pressed && styles.pressed]}>
        <Text style={[styles.inviteText, { color: colors.accent }]}>
          Tell {who} how to work with you
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={[styles.heading, { color: colors.textSubtle }]}>HOW {who.toUpperCase()} WORKS</Text>

      {open ? (
        <>
          <TextInput
            accessibilityLabel={`How ${who} should work with you`}
            multiline
            onBlur={() => void keep()}
            onChangeText={setBrief}
            placeholder="Coach me based on the book Outlive. I train five days a week."
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
            value={brief}
          />
          <Text style={[styles.note, { color: colors.textSubtle }]}>
            This shapes how {who} answers you here. It is not stored as a health record and nothing
            reads it back as one.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void keep();
              setOpen(false);
            }}
            style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
            <Text style={[styles.doneText, { color: colors.accent }]}>Done</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.card, { backgroundColor: colors.surface }, pressed && styles.pressed]}>
          <Text style={[styles.saved, { color: colors.textMuted }]}>{saved}</Text>
          <Text style={[styles.edit, { color: colors.accent }]}>Change it</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg },
  card: { borderRadius: radius.md, padding: spacing.md },
  done: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
  doneText: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  edit: { fontFamily: fontFamily.medium, fontSize: typography.caption, marginTop: spacing.sm },
  heading: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
    minHeight: 88,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  invite: { marginTop: spacing.lg, paddingVertical: spacing.sm },
  inviteText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  saved: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
  },
});

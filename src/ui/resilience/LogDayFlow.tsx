import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { hubs } from '@/application/hubs/hubs';
import { DAY_WORDS, dayEntryId, dayPayload, type DayWordId } from '@/ui/resilience/day';
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
 * Describing a day, in one word.
 *
 * Resilience waits hardest for hardware — variability and resting heart rate both need a watch —
 * and this is the half that needs no device. The fixture has named it as a way in since the hub was
 * drawn, under a button that did nothing.
 *
 * **One tap and you are done.** Choosing the word saves it; there is no second confirm step,
 * because a screen you visit every evening has to cost less than the thing it records. The note is
 * optional and the word is already stored by the time anybody types in it.
 *
 * **A word, not a number.** `day.ts` and `docs/decisions/0017` say why: the owner dropped Legacy's
 * 0-to-100 recovery score, and five integers would rebuild it through a side door.
 */

export function LogDayFlow() {
  const { colors } = useTheme();
  const router = useRouter();
  const [chosen, setChosen] = useState<DayWordId | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'failed' | 'idle' | 'saved' | 'saving'>('idle');

  async function save(word: DayWordId, text: string) {
    setState('saving');
    try {
      const now = new Date().toISOString();
      await hubs.add('resilience', 'day', dayPayload(word, text), {
        id: dayEntryId(now),
        source: 'manual',
      });
      setState('saved');
    } catch {
      setState('failed');
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.headerSide}>
          <Link asChild href="/hub/resilience">
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={[styles.backText, { color: colors.textMuted }]}>← Resilience</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>How today felt</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.question, { color: colors.text }]}>Which one is closest?</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          One tap saves it. Answering again later replaces today rather than adding a second one.
        </Text>

        <View style={styles.types}>
          {DAY_WORDS.map((word) => (
            <Pressable
              accessibilityRole="button"
              key={word.id}
              onPress={() => {
                setChosen(word.id);
                void save(word.id, note);
              }}
              style={({ pressed }) => [
                styles.type,
                word.id === chosen
                  ? { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder }
                  : { borderColor: colors.hairline },
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.typeText,
                  { color: word.id === chosen ? colors.accent : colors.text },
                ]}>
                {word.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {chosen !== null && (
          <>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>NOTE</Text>
              <TextInput
                onChangeText={setNote}
                placeholder="optional — what made it that way"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
                value={note}
              />
            </View>

            {/* The note arrives after the word is already stored, so it needs its own save — and
                saving again is the same day being corrected, which is what `dailyId` is for. */}
            {note.trim().length > 0 && (
              <Pressable
                accessibilityRole="button"
                disabled={state === 'saving'}
                onPress={() => void save(chosen, note)}
                style={({ pressed }) => [
                  styles.next,
                  { backgroundColor: colors.accent },
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[styles.nextText, { color: colors.onAccent, fontFamily: fontFamily.semi }]}>
                  {state === 'saving' ? 'Saving…' : 'Keep the note too'}
                </Text>
              </Pressable>
            )}
          </>
        )}

        {state === 'saved' && (
          <>
            <Text style={[styles.note, { color: colors.textSubtle }]}>
              Kept in Resilience. Your word, stored as a word — nothing here turns it into a score.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/hub/resilience')}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.accent }]}>
                See it in Resilience
              </Text>
            </Pressable>
          </>
        )}
        {state === 'failed' && (
          <Text style={[styles.note, { color: colors.warning }]}>
            That could not be saved. Nothing was lost — tap a word again.
          </Text>
        )}

        <Text style={[styles.hint, { color: colors.textSubtle }]}>
          These are never averaged. The hub counts how often each word came up and says so; it does
          not turn five words into a number out of ten.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { paddingVertical: spacing.xs },
  backText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  body: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  field: { marginTop: spacing.md },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerSide: { minWidth: 80 },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
    marginTop: spacing.xs,
  },
  input: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    fontFamily: fontFamily.body,
    fontSize: typography.body,
    paddingVertical: spacing.sm,
  },
  next: {
    alignItems: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  nextText: { fontSize: typography.body },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.md,
  },
  pressed: { opacity: 0.6 },
  problem: { fontFamily: fontFamily.body, fontSize: typography.caption, marginTop: spacing.xs },
  question: {
    fontFamily: fontFamily.display,
    fontSize: typography.heroInterpretation,
    letterSpacing: tracking.tight,
  },
  secondary: { alignItems: 'center', marginTop: spacing.md, paddingVertical: spacing.sm },
  secondaryText: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  screen: { flex: 1 },
  title: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  type: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  typeText: { fontFamily: fontFamily.body, fontSize: typography.body },
  types: { gap: spacing.sm, marginTop: spacing.lg },
});

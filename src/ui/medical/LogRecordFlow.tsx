import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { hubs } from '@/application/hubs/hubs';
import {
  NAME_LENGTH,
  STATUSES,
  nameProblem,
  problemMessage,
  recordEntryId,
  recordPayload,
  type RecordKind,
} from '@/ui/medical/record';
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
 * Recording a condition or a medication.
 *
 * One component for both because they are the same shape — a name, a status, one optional detail —
 * and two near-identical screens would drift apart on the day one of them got a better sentence.
 *
 * **The name is free text and always will be.** Offering a list to pick from would make the app the
 * thing that decides what somebody has. `record.ts` and `docs/decisions/0019` carry the rest of what
 * this refuses: no dose is judged, and no interaction between two medications is looked for.
 */

const WORDS: Readonly<Record<RecordKind, { detail: string; hint: string; question: string; title: string }>> = {
  condition: {
    detail: 'Since when',
    hint: 'Your words. There is no list to pick from here, and nothing you type is classified.',
    question: 'What would you call it?',
    title: 'Record a condition',
  },
  medication: {
    detail: 'Dose',
    hint: 'Your words, exactly as you take it. Nothing here is checked against anything.',
    question: 'What is it called?',
    title: 'Add a medication',
  },
};

export function LogRecordFlow({ kind }: { kind: RecordKind }) {
  const { colors } = useTheme();
  const router = useRouter();
  const words = WORDS[kind];
  const options = STATUSES[kind];

  const [name, setName] = useState('');
  const [status, setStatus] = useState(options[0]?.id ?? '');
  const [detail, setDetail] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'failed' | 'idle' | 'saved' | 'saving'>('idle');

  const issue = nameProblem(name);

  async function save() {
    if (issue !== null) return;
    setState('saving');
    try {
      await hubs.add('medical', kind, recordPayload(name, status, detail, note), {
        id: recordEntryId(kind, name),
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
          <Link asChild href="/hub/medical">
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={[styles.backText, { color: colors.textMuted }]}>← Health record</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{words.title}</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.question, { color: colors.text }]}>{words.question}</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{words.hint}</Text>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>NAME</Text>
          <TextInput
            onChangeText={setName}
            placeholder={`up to ${NAME_LENGTH.max} characters`}
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
            value={name}
          />
          {name.trim().length > 0 && issue !== null && (
            <Text style={[styles.problem, { color: colors.warning }]}>
              {problemMessage(kind, issue)}
            </Text>
          )}
        </View>

        <View style={styles.types}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.id}
              onPress={() => setStatus(option.id)}
              style={({ pressed }) => [
                styles.type,
                option.id === status
                  ? { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder }
                  : { borderColor: colors.hairline },
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.typeText,
                  { color: option.id === status ? colors.accent : colors.text },
                ]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>
            {words.detail.toUpperCase()}
          </Text>
          <TextInput
            onChangeText={setDetail}
            placeholder="optional"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
            value={detail}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>NOTE</Text>
          <TextInput
            onChangeText={setNote}
            placeholder="optional — anything your coach should know"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
            value={note}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={issue !== null || state === 'saving'}
          onPress={() => void save()}
          style={({ pressed }) => [
            styles.next,
            issue === null
              ? { backgroundColor: colors.accent }
              : { borderColor: colors.hairline, borderWidth: 1 },
            pressed && styles.pressed,
          ]}>
          <Text
            style={[
              styles.nextText,
              issue === null
                ? { color: colors.onAccent, fontFamily: fontFamily.semi }
                : { color: colors.textSubtle, fontFamily: fontFamily.body },
            ]}>
            {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Keep it'}
          </Text>
        </Pressable>

        {state === 'saved' && (
          <>
            <Text style={[styles.note, { color: colors.textSubtle }]}>
              Kept in your Health record. Typing the same name again edits it rather than adding a
              second one.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/hub/medical')}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.accent }]}>
                See your Health record
              </Text>
            </Pressable>
          </>
        )}
        {state === 'failed' && (
          <Text style={[styles.note, { color: colors.warning }]}>
            That could not be saved. Nothing was lost — try again.
          </Text>
        )}

        {/* The assumption this hub would otherwise invite, answered before it forms. */}
        <Text style={[styles.hint, { color: colors.textSubtle }]}>
          This app does not check any of this against anything. It looks for no interaction between
          two medications, judges no dose, and classifies no condition. It holds what you wrote so
          your coaches can read it.
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

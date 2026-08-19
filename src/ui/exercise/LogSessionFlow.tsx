import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { hubs } from '@/application/hubs/hubs';
import {
  DISTANCE_KM,
  MINUTES,
  SESSION_TYPES,
  distanceProblem,
  minutesProblem,
  problemMessage,
  sessionPayload,
  type SessionTypeId,
} from '@/ui/exercise/session';
import {
  fontFamily,
  lineHeights,
  radius,
  spacing,
  tracking,
  typography,
  useTheme,
  type ThemeColors,
} from '@/ui/theme';

/**
 * Logging a session by hand.
 *
 * Short on purpose — what, how long, and optionally how far. The owner's brief for creating a hub
 * was "a few plain questions rather than a form", and a session deserves the same: anything that
 * takes longer to record than it took to decide to record is a thing people stop doing.
 *
 * **This is what feeds the body figure.** Until it existed, the only way a muscle could be marked
 * was tapping it on the Twin, which is the correction rather than the input.
 *
 * The type list is `session.ts`'s, which is `muscleLoad.ts`'s. "Something else" is offered and is
 * honestly unplaceable — the figure reports it as a session it cannot place rather than guessing.
 */

type Step = 'detail' | 'type';

export function LogSessionFlow() {
  const { colors } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<SessionTypeId>('running');
  const [minutes, setMinutes] = useState('');
  const [distance, setDistance] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'failed' | 'idle' | 'saved' | 'saving'>('idle');

  const minutesIssue = minutesProblem(minutes);
  const distanceIssue = distanceProblem(distance);
  const canSave = minutesIssue === null && distanceIssue === null;
  const chosen = SESSION_TYPES.find((option) => option.id === type);

  async function save() {
    setState('saving');
    try {
      await hubs.add('exercise', 'session', sessionPayload(type, minutes, distance, note), {
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
          <Link asChild href="/hub/exercise">
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={[styles.backText, { color: colors.textMuted }]}>← Exercise</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Log a session</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 'type' && (
          <>
            <Text style={[styles.question, { color: colors.text }]}>What did you do?</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              The first seven show up on your body figure. “Something else” is recorded, and the
              figure says plainly that it cannot place it.
            </Text>

            <View style={styles.types}>
              {SESSION_TYPES.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  key={option.id}
                  onPress={() => {
                    setType(option.id);
                    setStep('detail');
                  }}
                  style={({ pressed }) => [
                    styles.type,
                    { borderColor: colors.hairline },
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.typeText, { color: colors.text }]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === 'detail' && (
          <>
            <Text style={[styles.question, { color: colors.text }]}>{chosen?.label}</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              How long it took is the only thing needed. Leave the rest if you did not measure it —
              blank stays unknown rather than becoming a zero.
            </Text>

            <Field
              colors={colors}
              label="Minutes"
              onChange={setMinutes}
              placeholder={`${MINUTES.min}–${MINUTES.max}`}
              problem={minutes.trim().length > 0 ? minutesIssue : null}
              value={minutes}
            />
            <Field
              colors={colors}
              label="Distance in km"
              onChange={setDistance}
              placeholder={`optional, up to ${DISTANCE_KM.max}`}
              problem={distanceIssue}
              value={distance}
            />
            <Field
              colors={colors}
              label="Note"
              onChange={setNote}
              placeholder="optional — how it felt, where it was"
              problem={null}
              value={note}
            />

            <Pressable
              accessibilityRole="button"
              disabled={!canSave || state === 'saving'}
              onPress={() => void save()}
              style={({ pressed }) => [
                styles.next,
                canSave
                  ? { backgroundColor: colors.accent }
                  : { borderColor: colors.hairline, borderWidth: 1 },
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.nextText,
                  canSave
                    ? { color: colors.onAccent, fontFamily: fontFamily.semi }
                    : { color: colors.textSubtle, fontFamily: fontFamily.body },
                ]}>
                {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Log it'}
              </Text>
            </Pressable>

            {state === 'saved' && (
              <>
                <Text style={[styles.note, { color: colors.textSubtle }]}>
                  {type === 'other'
                    ? 'Kept in Exercise. The body figure will say it cannot place this one.'
                    : 'Kept in Exercise, and on your body figure for the next seven days.'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/twin')}
                  style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                  <Text style={[styles.secondaryText, { color: colors.accent }]}>
                    See it on the twin
                  </Text>
                </Pressable>
              </>
            )}
            {state === 'failed' && (
              <Text style={[styles.note, { color: colors.warning }]}>
                That could not be saved. Nothing was lost — try again.
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('type')}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Back</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Field({
  colors,
  label,
  onChange,
  placeholder,
  problem,
  value,
}: {
  colors: ThemeColors;
  label: string;
  onChange: (text: string) => void;
  placeholder: string;
  problem: ReturnType<typeof minutesProblem>;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{label.toUpperCase()}</Text>
      <TextInput
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
        value={value}
      />
      {problem !== null && (
        <Text style={[styles.problem, { color: colors.warning }]}>{problemMessage(problem)}</Text>
      )}
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

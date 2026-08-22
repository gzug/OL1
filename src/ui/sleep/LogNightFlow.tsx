import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatDuration } from '@/application/format/metric';
import { hubs } from '@/application/hubs/hubs';
import {
  NIGHTS,
  SLEEP_MINUTES,
  nightEntryId,
  nightMinutes,
  nightPayload,
  nightProblem,
  problemMessage,
  type NightId,
  type NightProblem,
} from '@/ui/sleep/night';
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
 * Logging a night by hand.
 *
 * The Sleep hub has been on the ring since the owner first drew it and has never had a way in —
 * its own cockpit said "Neither way in is built yet" under two buttons that did nothing. This is
 * the first one, and it is the same shape as a session and a meal: **a few plain questions rather
 * than a form.**
 *
 * One number, and which night it was. Hours and minutes are asked separately because nobody knows
 * how many minutes they slept, and stored as one because `metric.ts` stores a duration in minutes.
 *
 * **What it does NOT ask for is a bed time and a wake time.** The fixture showed both, and both are
 * a second and third question on a screen somebody is filling in before coffee. The note field
 * takes them in words if they matter, and the facet claiming a rhythm stays honestly sample data
 * until a device is the one reporting it.
 *
 * Logging the same night twice REPLACES — `dailyId`, for the reason it exists. A second answer
 * about one night is a correction, never a second night.
 */

export function LogNightFlow() {
  const { colors } = useTheme();
  const router = useRouter();
  const [night, setNight] = useState<NightId>('last');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'failed' | 'idle' | 'saved' | 'saving'>('idle');

  const typedSomething = hours.trim().length > 0 || minutes.trim().length > 0;
  const issue = nightProblem(hours, minutes);
  const total = nightMinutes(hours, minutes);

  async function save() {
    if (total === null) return;
    setState('saving');
    try {
      const now = new Date().toISOString();
      await hubs.add('sleep', 'night', nightPayload(total, note), {
        id: nightEntryId(night, now),
        /* The morning you woke, which is the day the night belongs to. `night.ts` says why. */
        recordedAt: new Date(
          new Date(now).getTime() - (night === 'before' ? 86_400_000 : 0),
        ).toISOString(),
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
          <Link asChild href="/hub/sleep">
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={[styles.backText, { color: colors.textMuted }]}>← Sleep</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Add a night</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.question, { color: colors.text }]}>How long did you sleep?</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Roughly is fine. This is your own answer, not a measurement — nothing here pretends a watch
          was involved.
        </Text>

        <View style={styles.types}>
          {NIGHTS.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.id}
              onPress={() => setNight(option.id)}
              style={({ pressed }) => [
                styles.type,
                option.id === night
                  ? { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder }
                  : { borderColor: colors.hairline },
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.typeText,
                  { color: option.id === night ? colors.accent : colors.text },
                ]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field
          colors={colors}
          label="Hours"
          numeric
          onChange={setHours}
          placeholder="7"
          problem={null}
          value={hours}
        />
        <Field
          colors={colors}
          label="Minutes"
          numeric
          onChange={setMinutes}
          placeholder="30"
          problem={typedSomething ? issue : null}
          value={minutes}
        />
        <Field
          colors={colors}
          label="Note"
          onChange={setNote}
          placeholder="optional — how it felt, what woke you"
          problem={null}
          value={note}
        />

        {/* What was typed, written the way every other duration in this app is written. Reading it
            back is the whole check: "7h 30m" is unmistakably not "7 minutes 30". */}
        {total !== null && (
          <Text style={[styles.note, { color: colors.textMuted }]}>
            That is {formatDuration(total)}.
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={total === null || state === 'saving'}
          onPress={() => void save()}
          style={({ pressed }) => [
            styles.next,
            total !== null
              ? { backgroundColor: colors.accent }
              : { borderColor: colors.hairline, borderWidth: 1 },
            pressed && styles.pressed,
          ]}>
          <Text
            style={[
              styles.nextText,
              total !== null
                ? { color: colors.onAccent, fontFamily: fontFamily.semi }
                : { color: colors.textSubtle, fontFamily: fontFamily.body },
            ]}>
            {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Log it'}
          </Text>
        </Pressable>

        {state === 'saved' && (
          <>
            <Text style={[styles.note, { color: colors.textSubtle }]}>
              Kept in Sleep. Logging the same night again replaces it rather than counting twice.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/hub/sleep')}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.accent }]}>See it in Sleep</Text>
            </Pressable>
          </>
        )}
        {state === 'failed' && (
          <Text style={[styles.note, { color: colors.warning }]}>
            That could not be saved. Nothing was lost — try again.
          </Text>
        )}

        <Text style={[styles.hint, { color: colors.textSubtle }]}>
          Anything from {SLEEP_MINUTES.min} minutes to {SLEEP_MINUTES.max / 60} hours. A bad night is
          still a night and this will not argue with you about one.
        </Text>
      </ScrollView>
    </View>
  );
}

function Field({
  colors,
  label,
  numeric = false,
  onChange,
  placeholder,
  problem,
  value,
}: {
  colors: ThemeColors;
  label: string;
  /** The note is words. Two of the three fields here are not, and get the number pad. */
  numeric?: boolean;
  onChange: (text: string) => void;
  placeholder: string;
  problem: NightProblem | null;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{label.toUpperCase()}</Text>
      <TextInput
        keyboardType={numeric ? 'numeric' : 'default'}
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

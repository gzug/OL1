import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  plausibleBirthYear,
  plausibleHeightCm,
  profiles as defaultProfiles,
} from '@/application/profile/profile';
import type { Sex } from '@/core/profile';
import {
  NOT_READ,
  aboutYouFrom,
  summaryLine,
  type AboutYouState,
} from '@/ui/twin/aboutYou';
import { fontFamily, lineHeights, radius, spacing, tracking, typography, useTheme } from '@/ui/theme';

/**
 * The three things the Twin needs to know about you.
 *
 * **A birth year, because without it there is no biological age at all** — the calculation takes
 * chronological age as an input and returns null without one. A sex, because the figure draws one.
 * And a height, which arrived here on 2026-08-22 when the invented person block above it was
 * deleted: it was the one fact on that block worth keeping and the only one not already on screen.
 *
 * **Every answer may be skipped.** Legacy's profile grew a display name, a timezone, four unit
 * preferences, allergies, chronic diseases and supplements — an identity that became a medical
 * record. Anything of that kind belongs in the Health record hub as an entry somebody chose to make.
 *
 * **It says nothing at all until the store has answered.** This block held one `null` for three
 * different things — not read yet, read failed, and no profile — and printed the same invitation for
 * all three, so a database error asked somebody for a birth year they had already given. That
 * judgement now lives in `aboutYou.ts` where bare Node can hold it; `docs/decisions/0013`, shape 1.
 *
 * It sits on the Twin rather than behind a settings screen because this is where both answers are
 * used, and a setting two taps from the thing it changes is a setting nobody finds. Settings shows
 * the same fields; both write through `profiles`, so there is one store and no second copy.
 */

const SEXES: readonly { id: Sex; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
  { id: 'preferNotToSay', label: 'Rather not say' },
];

export function AboutYou({ source = defaultProfiles }: { source?: typeof defaultProfiles }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AboutYouState>(NOT_READ);

  /** Null means untouched, so a reload shows through rather than being overwritten by stale text. */
  const [year, setYear] = useState<string | null>(null);
  const [height, setHeight] = useState<string | null>(null);
  /** Null until somebody taps: a highlighted pill reads as a choice already made. */
  const [sex, setSex] = useState<Sex | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void source
        .read()
        .then((profile) => {
          if (!cancelled) setState(aboutYouFrom(profile, new Date()));
        })
        .catch(() => {
          /* Back to knowing nothing. It used to leave the invitation standing, so a store that would
             not open asked somebody for a year they had already given. */
          if (!cancelled) setState(NOT_READ);
        });
      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  const known = state.status === 'known' ? state : null;
  const storedSex: Sex = known === null ? 'preferNotToSay' : known.sex;
  const chosenSex = sex ?? (known === null ? null : known.sex);

  const storedYear = known === null ? null : known.birthYear;
  const storedHeight = known === null ? null : known.heightCm;
  const yearText = year ?? (storedYear === null ? '' : String(storedYear));
  const heightText = height ?? (storedHeight === null ? '' : String(storedHeight));

  const today = new Date();
  const typedYear = yearText.trim().length === 0 ? null : plausibleBirthYear(Number(yearText.trim()), today);
  const yearIsWrong = yearText.trim().length > 0 && typedYear === null;
  const typedHeight =
    heightText.trim().length === 0 ? null : plausibleHeightCm(Number(heightText.trim()));
  const heightIsWrong = heightText.trim().length > 0 && typedHeight === null;

  async function save() {
    await source.save(typedYear, chosenSex ?? storedSex);
    if (typedHeight !== null) await source.saveHeight(typedHeight);
    const written = await source.read();
    setState(aboutYouFrom(written, new Date()));
    setYear(null);
    setHeight(null);
    setSex(null);
    setOpen(false);
  }

  if (!open) {
    const line = summaryLine(state);
    /** Nothing looked up yet, or the lookup failed. Neither is something to tell somebody. */
    if (line === null) return null;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}>
        <Text style={[styles.summaryText, { color: colors.textSubtle }]}>{line}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.textSubtle }]}>ABOUT YOU</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Three things, and you can skip any of them. The year is what the biological age is calculated
        against; without it there is no number.
      </Text>

      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>YEAR OF BIRTH</Text>
      <TextInput
        inputMode="numeric"
        maxLength={4}
        onChangeText={(value) => setYear(value.replace(/[^0-9]/g, ''))}
        placeholder="1982"
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
        value={yearText}
      />
      {yearIsWrong && (
        <Text style={[styles.problem, { color: colors.warning }]}>
          That is not a year somebody was born in.
        </Text>
      )}

      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>HEIGHT IN CM</Text>
      <TextInput
        inputMode="numeric"
        maxLength={3}
        onChangeText={(value) => setHeight(value.replace(/[^0-9]/g, ''))}
        placeholder="178"
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
        value={heightText}
      />
      {heightIsWrong && (
        <Text style={[styles.problem, { color: colors.warning }]}>
          Centimetres — somewhere between 50 and 250.
        </Text>
      )}

      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>THE FIGURE DRAWN</Text>
      <View style={styles.options}>
        {SEXES.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: chosenSex === option.id }}
            key={option.id}
            onPress={() => setSex(option.id)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: chosenSex === option.id ? colors.accentSoft : 'transparent',
                borderColor: chosenSex === option.id ? colors.accentBorder : colors.hairline,
              },
              pressed && styles.pressed,
            ]}>
            <Text
              style={[
                styles.optionText,
                { color: chosenSex === option.id ? colors.accent : colors.textMuted },
              ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* The honest caveat: only one figure is drawn today, whatever is chosen here. Saying so beats
          a setting that silently does nothing. */}
      <Text style={[styles.hint, { color: colors.textSubtle }]}>
        Only the male figure is drawn so far. This is remembered and the drawing follows later.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => void save()}
        style={({ pressed }) => [
          styles.save,
          { backgroundColor: colors.accent },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.saveText, { color: colors.onAccent }]}>Save</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingTop: spacing.lg },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginTop: spacing.md,
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
  },
  input: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    fontFamily: fontFamily.body,
    fontSize: typography.body,
    paddingVertical: spacing.sm,
  },
  label: { fontFamily: fontFamily.medium, fontSize: typography.micro },
  option: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  optionText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  pressed: { opacity: 0.6 },
  problem: { fontFamily: fontFamily.body, fontSize: typography.caption, marginTop: spacing.xs },
  save: {
    alignItems: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  saveText: { fontFamily: fontFamily.semi, fontSize: typography.bodySmall },
  summary: { alignItems: 'center', paddingTop: spacing.md },
  summaryText: { fontFamily: fontFamily.body, fontSize: typography.caption },
});

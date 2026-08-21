import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ageFrom, plausibleBirthYear, profiles as defaultProfiles } from '@/application/profile/profile';
import type { Sex } from '@/core/profile';
import { fontFamily, lineHeights, radius, spacing, tracking, typography, useTheme } from '@/ui/theme';

/**
 * The two things the Twin needs to know about you.
 *
 * **A birth year, because without it there is no biological age at all** — the calculation takes
 * chronological age as an input and returns null without one. And a sex, because the figure draws
 * one; the owner asked for male for now and for the female figure to follow a setting, and this is
 * that setting arriving before the second figure does.
 *
 * **Two questions, and both may be skipped.** Legacy's profile grew a display name, a timezone,
 * four unit preferences, allergies, chronic diseases and supplements — an identity that became a
 * medical record. Anything of that kind belongs in the Health record hub as an entry somebody
 * chose to make, not as a field on a form nobody asked to fill in.
 *
 * It sits on the Twin rather than behind a settings screen because this is the only place either
 * answer is used, and a setting two taps from the thing it changes is a setting nobody finds.
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
  const [year, setYear] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [saved, setSaved] = useState<{ birthYear: number | null; sex: Sex } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void source
        .read()
        .then((profile) => {
          if (cancelled || profile === null) return;
          setSaved({ birthYear: profile.birthYear, sex: profile.sex });
          setYear(profile.birthYear === null ? '' : String(profile.birthYear));
          setSex(profile.sex);
        })
        .catch(() => {
          // Unreadable store leaves the form empty, which is the same as never having answered.
        });
      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  const today = new Date();
  const typed = year.trim().length === 0 ? null : plausibleBirthYear(Number(year.trim()), today);
  const yearIsWrong = year.trim().length > 0 && typed === null;
  const age = ageFrom(saved?.birthYear ?? null, today);

  async function save() {
    const profile = await source.save(typed, sex);
    setSaved({ birthYear: profile.birthYear, sex: profile.sex });
    setOpen(false);
  }

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}>
        <Text style={[styles.summaryText, { color: colors.textSubtle }]}>
          {age === null
            ? 'Add your year of birth to get a biological age'
            : `${age} years old · ${SEXES.find((entry) => entry.id === saved?.sex)?.label ?? ''}`}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.textSubtle }]}>ABOUT YOU</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Two things, and you can skip either. The year is what the biological age is calculated
        against; without it there is no number.
      </Text>

      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>YEAR OF BIRTH</Text>
      <TextInput
        inputMode="numeric"
        onChangeText={setYear}
        placeholder="1982"
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
        value={year}
      />
      {yearIsWrong && (
        <Text style={[styles.problem, { color: colors.warning }]}>
          That is not a year somebody was born in.
        </Text>
      )}

      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>THE FIGURE DRAWN</Text>
      <View style={styles.options}>
        {SEXES.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: sex === option.id }}
            key={option.id}
            onPress={() => setSex(option.id)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: sex === option.id ? colors.accentSoft : 'transparent',
                borderColor: sex === option.id ? colors.accentBorder : colors.hairline,
              },
              pressed && styles.pressed,
            ]}>
            <Text
              style={[
                styles.optionText,
                { color: sex === option.id ? colors.accent : colors.textMuted },
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

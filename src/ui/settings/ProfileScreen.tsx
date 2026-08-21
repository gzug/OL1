import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SPORT_HUB } from '@/application/exercise/sportCoaches';
import { hubs as defaultHubs } from '@/application/hubs/hubs';
import {
  ageFrom,
  plausibleBirthYear,
  plausibleHeightCm,
  profiles as defaultProfiles,
} from '@/application/profile/profile';
import type { Sex } from '@/core/profile';
import { answerId } from '@/ui/hubs/entryWords';
import { COPY as FIRST_RUN, SKIPPED } from '@/ui/onboarding/firstRun';
import { fontFamily, radius, spacing, typography, useTheme } from '@/ui/theme';

import { Label, Note, Problem, Screen } from './chrome';
import { COPY } from './rows';
import { shownSex, sportPayload, sportsFrom } from './settings';
import { useSettings } from './useSettings';

/** Legacy's own set, unchanged, and the same four the first run offers. */
const SEXES: readonly { id: Sex; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
  { id: 'preferNotToSay', label: 'Rather not say' },
];

/**
 * Profile — who you are, in the terms the app actually reasons with.
 *
 * **Why the sports are here rather than on their own screen.** Naming a sport is a fact about you,
 * not a setting on the app: it earns you that sport's coach and nothing else, because every session
 * ever logged goes to Exercise with the sport as a field. `docs/decisions/0014`.
 *
 * **Weight is deliberately absent**, though the first run asks for it. A weight is a measurement
 * with a date, filed as a weigh-in in Nutrition; a field here would file a fresh one every time this
 * screen was opened and tell somebody they had weighed themselves on a day they had not.
 * `core/profile.ts` draws the same line — a height stops changing and a weight does not.
 *
 * **Saved on blur, not by a button**, matching `HubBrief`. A save button on a form somebody edits
 * and re-edits is a way to lose what was typed.
 */
export function ProfileScreen({
  hubSource = defaultHubs,
  profileSource = defaultProfiles,
}: {
  hubSource?: typeof defaultHubs;
  profileSource?: typeof defaultProfiles;
}) {
  const { colors } = useTheme();
  const { data, reload } = useSettings(hubSource, profileSource);

  /** `null` means untouched, so the stored value shows through and a reload is picked up. */
  const [year, setYear] = useState<string | null>(null);
  const [height, setHeight] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (data.status === 'unknown') return <Screen title={COPY.profileTitle}>{null}</Screen>;
  if (data.status === 'failed') {
    return (
      <Screen title={COPY.profileTitle}>
        <Note text={COPY.unread} />
      </Screen>
    );
  }

  const stored = data.value.profile;
  const storedYear = stored === null ? null : stored.birthYear;
  const storedHeight = stored === null ? null : stored.heightCm;
  /** `null` until somebody has answered, so no pill is shown as already chosen. See `shownSex`. */
  const sex: Sex | null = shownSex(stored);

  const yearText = year ?? (storedYear === null ? '' : String(storedYear));
  const heightText = height ?? (storedHeight === null ? '' : String(storedHeight));

  const today = new Date();
  const typedYear =
    yearText.trim().length === 0 ? null : plausibleBirthYear(Number(yearText.trim()), today);
  const yearIsWrong = yearText.trim().length > 0 && typedYear === null;
  const typedHeight =
    heightText.trim().length === 0 ? null : plausibleHeightCm(Number(heightText.trim()));
  const heightIsWrong = heightText.trim().length > 0 && typedHeight === null;

  /**
   * Tapping a sex pill blurs the year box, so both writes fire at once — and `save` writes BOTH
   * fields, so a sex write carrying the pre-edit year would undo the year write that fired a moment
   * earlier. Reading what is on screen rather than what was last stored is what stops them racing.
   */
  const yearToSave = yearIsWrong ? storedYear : typedYear;
  const age = ageFrom(storedYear, today);
  const sports = sportsFrom(data.value.entries[SPORT_HUB] ?? []);
  const named = sports.filter((sport) => sport.named).map((sport) => sport.coachId);

  async function keep(write: () => Promise<unknown>, clear?: () => void) {
    setFailed(false);
    try {
      await write();
      clear?.();
      reload();
    } catch {
      // What was typed stays on screen. Losing it to a failed write is the worst outcome here.
      setFailed(true);
    }
  }

  function nameSport(coachId: string) {
    const sport = sports.find((entry) => entry.coachId === coachId);
    /**
     * Naming an already-named sport writes NOTHING. The answer has not changed, and the row would
     * carry the same `answerId` anyway — but skipping the write means the store is not touched and
     * the screen does not flicker through a reload for a change nobody made.
     */
    if (sport === undefined || sport.named) return;
    void keep(() =>
      hubSource.add(SPORT_HUB, 'sport', sportPayload(sport), {
        id: answerId('sport', SPORT_HUB, sport.coachId),
      }),
    );
  }

  return (
    <Screen title={COPY.profileTitle}>
      <Label text={FIRST_RUN.yearLabel} />
      <View style={[local.field, { backgroundColor: colors.surface }]}>
        <TextInput
          inputMode="numeric"
          maxLength={4}
          onBlur={() => {
            if (year === null || yearIsWrong) return;
            void keep(
              () => profileSource.save(typedYear, sex ?? SKIPPED.sex),
              () => setYear(null),
            );
          }}
          onChangeText={(value) => setYear(value.replace(/[^0-9]/g, ''))}
          placeholder="1982"
          placeholderTextColor={colors.textSubtle}
          style={[local.input, { color: colors.text }]}
          value={yearText}
        />
      </View>
      {yearIsWrong && <Problem text={FIRST_RUN.yearWrong} />}
      {/* Derived from the year and never stored — a stored age is wrong from the next birthday on. */}
      {age !== null && <Note text={`${age} years old`} />}

      <Label text={FIRST_RUN.heightLabel} />
      <View style={[local.field, { backgroundColor: colors.surface }]}>
        <TextInput
          inputMode="numeric"
          maxLength={3}
          onBlur={() => {
            if (height === null || heightIsWrong) return;
            void keep(
              () => profileSource.saveHeight(typedHeight),
              () => setHeight(null),
            );
          }}
          onChangeText={(value) => setHeight(value.replace(/[^0-9]/g, ''))}
          placeholder="178"
          placeholderTextColor={colors.textSubtle}
          style={[local.input, { color: colors.text }]}
          value={heightText}
        />
      </View>
      {heightIsWrong && <Problem text={FIRST_RUN.heightWrong} />}

      <Label text={FIRST_RUN.sexLabel} />
      <Pills
        chosen={sex === null ? [] : [sex]}
        onPick={(id) => void keep(() => profileSource.save(yearToSave, id as Sex))}
        options={SEXES}
      />
      <Note text={FIRST_RUN.sexOnlyMale} />

      <Label text={LABEL_TRAINING} />
      <Pills
        chosen={named}
        onPick={nameSport}
        options={sports.map((sport) => ({ id: sport.coachId, label: sport.label }))}
      />
      <Note text={FIRST_RUN.trainingHint} />

      {failed && <Problem text={COPY.saveFailed} />}
    </Screen>
  );
}

/** Short enough for a micro label, where the first run's question mark would not fit. */
const LABEL_TRAINING = 'WHAT YOU TRAIN';

/**
 * One row of choices, whether the question has one answer or several.
 *
 * `chosen` is a list either way. The sex question passes one and the training question passes
 * however many are named, and rendering both with one component is what keeps them looking like the
 * same kind of question — which they are.
 */
function Pills({
  chosen,
  onPick,
  options,
}: {
  chosen: readonly string[];
  onPick: (id: string) => void;
  options: readonly { id: string; label: string }[];
}) {
  const { colors } = useTheme();

  return (
    <View style={local.pills}>
      {options.map((option) => {
        const on = chosen.includes(option.id);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            key={option.id}
            onPress={() => onPick(option.id)}
            style={({ pressed }) => [
              local.pill,
              {
                backgroundColor: on ? colors.accentSoft : colors.surface,
                borderColor: on ? colors.accentBorder : 'transparent',
              },
              pressed && local.pressed,
            ]}>
            <Text style={[local.pillText, { color: on ? colors.accent : colors.textMuted }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const local = StyleSheet.create({
  field: { borderRadius: radius.md, paddingHorizontal: spacing.md },
  input: { fontFamily: fontFamily.body, fontSize: typography.body, paddingVertical: spacing.md },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  pillText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pressed: { opacity: 0.6 },
});

import { useState } from 'react';
import { TextInput } from 'react-native';

import {
  ageFrom,
  plausibleBirthYear,
  plausibleHeightCm,
  profiles as defaultProfiles,
} from '@/application/profile/profile';
import type { Profile, Sex } from '@/core/profile';
import { COPY as FIRST_RUN, SKIPPED } from '@/ui/onboarding/firstRun';
import { useTheme } from '@/ui/theme';

import { Chip, Chips, Field, Note, Problem, Section, styles } from './parts';
import { COPY, shownSex, type Loaded } from './settings';

/** Legacy's own set, unchanged, and the same four the first run offers. */
const SEXES: readonly { id: Sex; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
  { id: 'preferNotToSay', label: 'Rather not say' },
];

/**
 * The three things the first run asks about you, asked again.
 *
 * **The labels and the caveats come from `firstRun.ts`.** A second copy of *only the male figure is
 * drawn so far* is a second sentence to keep true when the female figure lands, and the one that
 * does not get updated is the one nobody was looking at.
 *
 * **Weight is deliberately not here**, though the first run asks for it. A weight is a measurement
 * with a date, filed as a weigh-in in Nutrition; a Settings field that re-asked it would file a
 * fresh weigh-in every time this screen was opened and tell somebody they had weighed themselves on
 * a day they had not. `core/profile.ts` draws the same line for the same reason — a height stops
 * changing and a weight does not.
 *
 * **Saved on blur, not by a button**, matching `HubBrief`. A save button on a form somebody edits
 * and re-edits is a way to lose what was typed.
 */
export function AboutYouSection({
  onSaved,
  profile,
  source = defaultProfiles,
}: {
  onSaved: () => void;
  profile: Loaded<Profile | null>;
  source?: typeof defaultProfiles;
}) {
  const { colors } = useTheme();
  /** `null` means untouched, so the stored value shows through and a reload is picked up. */
  const [year, setYear] = useState<string | null>(null);
  const [height, setHeight] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (profile.status === 'unknown') return null;
  if (profile.status === 'failed') {
    return (
      <Section title={COPY.aboutTitle}>
        <Note text={COPY.unread} />
      </Section>
    );
  }

  const stored = profile.value;
  const storedYear = stored === null ? null : stored.birthYear;
  const storedHeight = stored === null ? null : stored.heightCm;
  /** `null` when nobody has answered, so no pill is highlighted. See `shownSex`. */
  const sex: Sex | null = shownSex(stored);

  const yearText = year ?? (storedYear === null ? '' : String(storedYear));
  const heightText = height ?? (storedHeight === null ? '' : String(storedHeight));

  const today = new Date();
  const typedYear = yearText.trim().length === 0 ? null : plausibleBirthYear(Number(yearText.trim()), today);
  const yearIsWrong = yearText.trim().length > 0 && typedYear === null;
  const typedHeight =
    heightText.trim().length === 0 ? null : plausibleHeightCm(Number(heightText.trim()));
  const heightIsWrong = heightText.trim().length > 0 && typedHeight === null;

  /**
   * The year `save` should carry, whether or not the box has been left yet.
   *
   * Tapping a sex pill blurs the year box, so both writes fire at once — and `save` writes BOTH
   * fields, so a sex write carrying the pre-edit year would undo the year write that fired a
   * moment earlier. Reading what is on screen rather than what was last stored is what stops the
   * two racing.
   */
  const yearToSave = yearIsWrong ? storedYear : typedYear;
  const age = ageFrom(storedYear, today);

  async function keep(write: () => Promise<unknown>, clear?: () => void) {
    setFailed(false);
    try {
      await write();
      clear?.();
      onSaved();
    } catch {
      // What was typed stays on screen. Losing it to a failed write is the worst outcome here.
      setFailed(true);
    }
  }

  return (
    <Section hint={COPY.aboutHint} title={COPY.aboutTitle}>
      <Field label={FIRST_RUN.yearLabel}>
        <TextInput
          inputMode="numeric"
          maxLength={4}
          onBlur={() => {
            if (year === null || yearIsWrong) return;
            void keep(() => source.save(typedYear, sex ?? SKIPPED.sex), () => setYear(null));
          }}
          onChangeText={(value) => setYear(value.replace(/[^0-9]/g, ''))}
          placeholder="1982"
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
          value={yearText}
        />
      </Field>
      {yearIsWrong && <Problem text={FIRST_RUN.yearWrong} />}
      {/* Derived from the year and never stored — a stored age is wrong from the next birthday on. */}
      {age !== null && <Note text={`${age} ${COPY.ageSuffix}`} />}

      <Field label={FIRST_RUN.heightLabel}>
        <TextInput
          inputMode="numeric"
          maxLength={3}
          onBlur={() => {
            if (height === null || heightIsWrong) return;
            void keep(() => source.saveHeight(typedHeight), () => setHeight(null));
          }}
          onChangeText={(value) => setHeight(value.replace(/[^0-9]/g, ''))}
          placeholder="178"
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
          value={heightText}
        />
      </Field>
      {heightIsWrong && <Problem text={FIRST_RUN.heightWrong} />}

      <Field label={FIRST_RUN.sexLabel}>
        <Chips>
          {SEXES.map((option) => (
            <Chip
              key={option.id}
              label={option.label}
              on={sex === option.id}
              onPress={() => void keep(() => source.save(yearToSave, option.id))}
            />
          ))}
        </Chips>
      </Field>
      <Note text={FIRST_RUN.sexOnlyMale} />

      {failed && <Problem text={COPY.saveFailed} />}
    </Section>
  );
}

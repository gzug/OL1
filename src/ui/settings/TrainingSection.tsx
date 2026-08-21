import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { SPORT_HUB } from '@/application/exercise/sportCoaches';
import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { fontFamily, lineHeights, typography, useTheme } from '@/ui/theme';

import { Chip, Chips, Field, Problem, Section } from './parts';
import { COPY, sportPayload, sportsFrom, type SportChoice } from './settings';
import type { SettingsData } from './useSettings';
import { answerId } from '@/ui/hubs/entryWords';

/**
 * What you train, asked again.
 *
 * **A sport is a voice, not a room** — `docs/decisions/0014`, which landed the same day this screen
 * was designed. Naming one writes a row on Exercise carrying its coach id, and that is the whole of
 * what it does: there is no sport hub to create, because every session ever logged goes to Exercise
 * with the sport as a field on the payload.
 *
 * **Naming is add-only, and the section says so rather than offering a switch that lies.**
 * `sportCoachesFor` keeps the FIRST row per coach, so an un-naming written after it would be read
 * straight past and the drawer would go on offering a coach somebody had just turned off. That is
 * worse than not offering the switch. Making it work means changing that reader, which belongs to
 * the session that wrote it.
 *
 * A sport that is already named is not a chip. A chip that cannot be turned off is a dead control,
 * and a person taps it once, sees nothing happen, and stops trusting the screen.
 */
export function TrainingSection({
  data,
  onChanged,
  source = defaultHubs,
}: {
  data: SettingsData;
  onChanged: () => void;
  source?: typeof defaultHubs;
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  const sports = sportsFrom(data.entries[SPORT_HUB] ?? []);
  const named = sports.filter((sport) => sport.named);
  const rest = sports.filter((sport) => !sport.named);

  async function name(sport: SportChoice) {
    setFailed(false);
    try {
      /* An answer, not an event — the same id every time. See `answerId`. */
      await source.add(SPORT_HUB, 'sport', sportPayload(sport), {
        id: answerId('sport', SPORT_HUB, sport.coachId),
      });
      onChanged();
    } catch {
      setFailed(true);
    }
  }

  return (
    <Section hint={COPY.trainingHint} title={COPY.trainingTitle}>
      {named.length > 0 && (
        <Field label={COPY.trainingNamed}>
          <Text style={[local.named, { color: colors.text }]}>
            {named.map((sport) => sport.label).join(' · ')}
          </Text>
        </Field>
      )}

      {rest.length > 0 && (
        <Chips>
          {rest.map((sport) => (
            <Chip key={sport.coachId} label={sport.label} on={false} onPress={() => void name(sport)} />
          ))}
        </Chips>
      )}

      {failed && <Problem text={COPY.saveFailed} />}
    </Section>
  );
}

const local = StyleSheet.create({
  named: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
  },
});

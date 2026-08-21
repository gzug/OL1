import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { draftId, draftProblem, problemMessage } from '@/ui/hubs/newHub';
import { COPY as FIRST_RUN } from '@/ui/onboarding/firstRun';
import { fontFamily, spacing, typography, useTheme } from '@/ui/theme';

import { Chip, Chips, Field, Problem, Section, styles } from './parts';
import { COPY, goalPayload, goalsFrom, type GoalChoice } from './settings';
import type { SettingsData } from './useSettings';

/**
 * What you want, asked again.
 *
 * **The chips are read out of the store, not listed here.** The owner asked what happens to a goal
 * he typed himself — the first run makes a hub for it and writes the goal inside, so reading every
 * hub's goal entries is what puts his own answers in the same list as the seven that ship. A fixed
 * list of seven would have shown him someone else's idea of what he wants.
 *
 * **A tap converges; it does not accumulate.** `hubs.add` is not idempotent, so a screen that wrote
 * on every tap would leave a person with four copies of *Sleep better* and no way to tell which one
 * counted. Turning one off writes that it was dropped and `goalsFrom` reads the newest row back;
 * nothing is deleted, because nothing in OL1 deletes.
 *
 * **Turning a goal off never touches the hub it lives in.** They are different acts and conflating
 * them destroys data by implication — a hub holds meals and blood panels that have nothing to do
 * with the goal that happened to create it. Putting a hub away is the section below, and only there.
 */
export function GoalsSection({
  data,
  onChanged,
  source = defaultHubs,
}: {
  data: SettingsData;
  onChanged: () => void;
  source?: typeof defaultHubs;
}) {
  const { colors } = useTheme();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const goals = goalsFrom(data.entries);
  const name = typed.trim();
  const problem = name.length === 0 ? null : draftProblem({ focus: '', name }, data.hubs);

  async function toggle(goal: GoalChoice) {
    setFailed(false);
    try {
      await source.add(goal.hubId, 'goal', goalPayload(goal.label, !goal.held));
      onChanged();
    } catch {
      setFailed(true);
    }
  }

  /**
   * A goal nothing here covers, and the only thing on this screen that makes a hub.
   *
   * The same path `FirstRunFlow.createFrom` takes, against the same guard and the same live hub
   * list: `newHub.ts` sets a new hub's coach to its own id, so a goal typed here arrives with a
   * coach attached exactly as one typed in the first run does.
   */
  async function create() {
    if (problem !== null || name.length === 0 || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const id = draftId(name);
      await source.create({ coachId: id, id, label: name });
      await source.add(id, 'goal', goalPayload(name, true));
      setTyped('');
      onChanged();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section hint={COPY.goalsHint} title={COPY.goalsTitle}>
      <Chips>
        {goals.map((goal) => (
          <Chip
            key={goal.label}
            label={goal.label}
            on={goal.held}
            onPress={() => void toggle(goal)}
          />
        ))}
      </Chips>

      <Field label={FIRST_RUN.goalsOther}>
        <View style={local.line}>
          <TextInput
            onChangeText={setTyped}
            onSubmitEditing={() => void create()}
            placeholder="Learning to sleep without a phone"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, local.input, { borderColor: colors.hairline, color: colors.text }]}
            value={typed}
          />
          {name.length > 0 && problem === null && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void create()}
              style={({ pressed }) => [local.add, pressed && styles.pressed]}>
              <Text style={[local.addText, { color: colors.accent }]}>{busy ? 'Adding…' : 'Add'}</Text>
            </Pressable>
          )}
        </View>
      </Field>
      {problem !== null && <Problem text={problemMessage(problem)} />}

      {failed && <Problem text={COPY.saveFailed} />}
    </Section>
  );
}

const local = StyleSheet.create({
  add: { paddingLeft: spacing.md, paddingVertical: spacing.sm },
  addText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  input: { flex: 1 },
  line: { alignItems: 'flex-end', flexDirection: 'row' },
});

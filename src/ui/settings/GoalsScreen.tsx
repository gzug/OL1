import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { answerId } from '@/ui/hubs/entryWords';
import { findHub } from '@/ui/hubs/catalog';
import { draftId, draftProblem, problemMessage } from '@/ui/hubs/newHub';
import { fontFamily, radius, spacing, typography, useTheme } from '@/ui/theme';

import { Label, Line, Note, Problem, Screen } from './chrome';
import { COPY } from './rows';
import { goalPayload, goalsFrom, type GoalChoice } from './settings';
import { useSettings } from './useSettings';

/**
 * Goals — what you are trying to get out of this.
 *
 * **It is not a wall of tick-boxes, and that is the owner's correction, made twice.** The old screen
 * showed all seven at once with the ones you hold highlighted, which asks you to read past five
 * things you do not want in order to find the two you do. No serious health app does this: Whoop
 * gives you one weekly plan, Oura one number on a slider, Levels one programme. What they share is
 * that a goal is something you HAVE, not a checklist you fill in.
 *
 * So this screen leads with the goals you hold, and adding one is a separate, quieter act below.
 *
 * **What is still open** — whether One L1fe should allow several goals at all, or one focus like the
 * three apps above. That is a product decision rather than a screen decision, and this shape works
 * either way: with one focus the top list simply never has a second row.
 *
 * **Nothing here deletes.** Removing a goal writes that you dropped it, on the same row it was
 * written to — `answerId` — so changing your mind replaces rather than accumulates, and the Sleep
 * hub does not end up saying "4 goals" to somebody holding none.
 */
export function GoalsScreen({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const { data, reload } = useSettings(source);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (data.status === 'unknown') return <Screen title={COPY.goalsTitle}>{null}</Screen>;
  if (data.status === 'failed') {
    return (
      <Screen title={COPY.goalsTitle}>
        <Note text={COPY.unread} />
      </Screen>
    );
  }

  const goals = goalsFrom(data.value.entries);
  const held = goals.filter((goal) => goal.held);
  const rest = goals.filter((goal) => !goal.held);

  const name = typed.trim();
  const problem = name.length === 0 ? null : draftProblem({ focus: '', name }, data.value.hubs);

  async function write(run: () => Promise<unknown>) {
    setFailed(false);
    try {
      await run();
      reload();
    } catch {
      setFailed(true);
    }
  }

  function set(goal: GoalChoice, hold: boolean) {
    void write(() =>
      source.add(goal.hubId, 'goal', goalPayload(goal.label, hold), {
        id: answerId('goal', goal.hubId, goal.label),
      }),
    );
  }

  /**
   * A goal nothing here covers, and the only thing on this screen that makes a hub.
   *
   * The same path `FirstRunFlow.createFrom` takes, against the same guard and the same live hub
   * list, so a goal typed here cannot collide with a hub that already ships and arrives with its own
   * coach exactly as one typed in the first run does.
   */
  async function create() {
    if (problem !== null || name.length === 0 || busy) return;
    setBusy(true);
    try {
      const id = draftId(name);
      await write(async () => {
        await source.create({ coachId: id, id, label: name });
        await source.add(id, 'goal', goalPayload(name, true), { id: answerId('goal', id, name) });
      });
      setTyped('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title={COPY.goalsTitle}>
      <Label text={COPY.goalsYours} />
      {held.length === 0 ? (
        <Note text={COPY.goalsHint} />
      ) : (
        held.map((goal) => (
          <Line
            action={COPY.goalsRemove}
            key={goal.label}
            label={goal.label}
            onPress={() => set(goal, false)}
            value={findHub(goal.hubId, data.value.hubs)?.label}
          />
        ))
      )}

      {rest.length > 0 && (
        <>
          <Label text={COPY.goalsAdd.toUpperCase()} />
          <View style={local.pills}>
            {rest.map((goal) => (
              <Pressable
                accessibilityRole="button"
                key={goal.label}
                onPress={() => set(goal, true)}
                style={({ pressed }) => [
                  local.pill,
                  { backgroundColor: colors.surface },
                  pressed && local.pressed,
                ]}>
                <Text style={[local.pillText, { color: colors.textMuted }]}>{goal.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Label text={COPY.goalsOwn} />
      <View style={[local.field, { backgroundColor: colors.surface }]}>
        <TextInput
          onChangeText={setTyped}
          onSubmitEditing={() => void create()}
          placeholder="Learning to cook properly"
          placeholderTextColor={colors.textSubtle}
          style={[local.input, { color: colors.text }]}
          value={typed}
        />
        {name.length > 0 && problem === null && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void create()}
            style={({ pressed }) => [local.add, pressed && local.pressed]}>
            <Text style={[local.addText, { color: colors.accent }]}>
              {busy ? 'Adding…' : 'Add'}
            </Text>
          </Pressable>
        )}
      </View>
      {problem !== null && <Problem text={problemMessage(problem)} />}

      {failed && <Problem text={COPY.saveFailed} />}
    </Screen>
  );
}

const local = StyleSheet.create({
  add: { paddingLeft: spacing.md, paddingVertical: spacing.sm },
  addText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  field: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.body,
    paddingVertical: spacing.md,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  pillText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pressed: { opacity: 0.6 },
});

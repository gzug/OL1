import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { hubs } from '@/application/hubs/hubs';
import {
  MACROS,
  filledCount,
  macroProblem,
  macroProblems,
  macrosAgree,
  mealPayload,
  problemMessage,
  type MacroDefinition,
  type MacroEntry,
} from '@/ui/meals/nutrition';
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
 * Logging a meal, the way Legacy's `vision/NutritionUploadScreen` does it.
 *
 * The same discipline as the lab panel: a photo does not import anything. It lands in a review step
 * where the user confirms every number, because a vision model's estimate of a plate of food is a
 * guess with a confidence attached, not a measurement.
 *
 * Two things are lifted straight from Legacy's prompt and are the reason this has three steps rather
 * than two:
 *
 * - **The note overrides the photo.** Legacy tells the model the user's note MUST override visual
 *   portions or add hidden ingredients. A photo cannot see the oil in the pan or the sugar in the
 *   sauce, so the note is asked for BEFORE the estimate rather than offered as an afterthought.
 * - **Fibre may stay unknown.** Legacy refuses to fabricate it. Leaving it blank here is a first
 *   class answer, not an incomplete form.
 *
 * Nothing reads the photo yet, so the numbers start empty and the screen says so. **What the user
 * confirms IS stored**, as of 2026-08-19 — the review step was built before there was anywhere to
 * put its result, and this is that half arriving.
 */

type Step = 'note' | 'review' | 'way';

/**
 * How the meal was described, carried through to the stored entry's `source`.
 *
 * Recorded rather than assumed: a cockpit that says "9 meals logged" is a different claim from
 * "9 meals, 6 of them from a photo", and the second one is only available if nobody guessed.
 */
type MealWay = 'camera' | 'described' | 'library';

export function LogMealFlow() {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('way');
  const [note, setNote] = useState('');
  const [way, setWay] = useState<MealWay>('described');
  const [entries, setEntries] = useState<readonly MacroEntry[]>(
    MACROS.map((macro) => ({ key: macro.key, text: '' })),
  );
  const [state, setState] = useState<'failed' | 'idle' | 'saved' | 'saving'>('idle');

  const problems = macroProblems(entries);
  const filled = filledCount(entries);
  const agree = macrosAgree(entries);
  const canSave = filled > 0 && problems.length === 0;

  async function save() {
    setState('saving');
    try {
      await hubs.add('nutrition', 'meal', mealPayload(entries, note), { source: way });
      setState('saved');
    } catch {
      // Everything typed is still on screen and the button can be pressed again. Navigating away
      // or clearing the form would lose the one thing here that cannot be reproduced.
      setState('failed');
    }
  }

  function setEntry(key: string, text: string) {
    setEntries((current) =>
      current.map((entry) => (entry.key === key ? { ...entry, text } : entry)),
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.headerSide}>
          <Link asChild href="/hub/nutrition">
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={[styles.backText, { color: colors.textMuted }]}>← Nutrition</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Log a meal</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 'way' && (
          <>
            <Text style={[styles.question, { color: colors.text }]}>What did you eat?</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              A photo is a starting point. You check the numbers before anything is kept.
            </Text>

            <Way
              colors={colors}
              detail="Point it at the plate."
              label="Take a photo"
              onPress={() => {
                setWay('camera');
                setStep('note');
              }}
            />
            <Way
              colors={colors}
              detail="One already in your camera roll."
              label="Choose a photo"
              onPress={() => {
                setWay('library');
                setStep('note');
              }}
            />
            <Way
              colors={colors}
              detail="No photo — just say what it was."
              label="Describe it"
              onPress={() => {
                setWay('described');
                setStep('note');
              }}
            />
          </>
        )}

        {step === 'note' && (
          <>
            <Text style={[styles.question, { color: colors.text }]}>
              What can the photo not see?
            </Text>
            {/* Asked BEFORE the estimate, not after. Legacy's prompt makes the note override what
                the picture shows, which only works if it exists by the time anything is read. */}
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Oil, butter, sugar in the sauce, how big the portion really was. This overrides the
              picture — a photo is bad at exactly these.
            </Text>
            <TextInput
              accessibilityLabel="What the photo cannot see"
              autoFocus
              multiline
              onChangeText={setNote}
              placeholder="Fried in about a tablespoon of oil. Bigger portion than it looks."
              placeholderTextColor={colors.textSubtle}
              style={[
                styles.input,
                styles.inputTall,
                { borderColor: colors.hairline, color: colors.text },
              ]}
              value={note}
            />
            <Next colors={colors} disabled={false} label="Next" onPress={() => setStep('review')} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('way')}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Back</Text>
            </Pressable>
          </>
        )}

        {step === 'review' && (
          <>
            <Text style={[styles.question, { color: colors.text }]}>Check the estimate</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Reading the photo is not built yet, so the numbers start empty. Leave anything you do
              not know — fibre especially is often unknowable and stays that way.
            </Text>

            <SectionLabel colors={colors} label={`Estimate · ${filled} of 5 filled`} />
            {MACROS.map((macro) => (
              <MacroRow
                colors={colors}
                key={macro.key}
                macro={macro}
                onChange={(text) => setEntry(macro.key, text)}
                text={entries.find((entry) => entry.key === macro.key)?.text ?? ''}
              />
            ))}

            {/* A warning, never a block. A mixed dish can genuinely miss by a wide margin. */}
            {agree === false && (
              <Text style={[styles.warning, { color: colors.warning }]}>
                The calories and the macros do not agree at 4/4/9. One of them is probably a typo —
                worth a look, but you can save it anyway.
              </Text>
            )}

            {note.trim().length > 0 && (
              <>
                <SectionLabel colors={colors} label="Your note" />
                <Text style={[styles.noteEcho, { color: colors.textMuted }]}>{note.trim()}</Text>
              </>
            )}

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
                {problems.length > 0
                  ? `${problems.length} to fix`
                  : filled === 0
                    ? 'Fill at least one'
                    : state === 'saving'
                      ? 'Saving…'
                      : state === 'saved'
                        ? 'Saved'
                        : 'Save this meal'}
              </Text>
            </Pressable>

            {/* What is stored, and what is not. The macros left blank are ABSENT rather than zero
                — `mealPayload` enforces that — and saying so here is what stops someone filling
                them with guesses to make the screen look complete. */}
            {state === 'saved' && (
              <Text style={[styles.note, { color: colors.textSubtle }]}>
                Kept in Nutrition. Anything you left blank stays unknown rather than becoming a zero.
              </Text>
            )}
            {state === 'failed' && (
              <Text style={[styles.note, { color: colors.warning }]}>
                That could not be saved. Nothing was lost — the numbers are still here, try again.
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('note')}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Back</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MacroRow({
  colors,
  macro,
  onChange,
  text,
}: {
  colors: ThemeColors;
  macro: MacroDefinition;
  onChange: (text: string) => void;
  text: string;
}) {
  const problem = macroProblem(macro, text);

  return (
    <View style={[styles.macroRow, { borderTopColor: colors.borderSubtle }]}>
      <View style={styles.macroLeft}>
        <Text style={[styles.macroLabel, { color: colors.text }]}>{macro.label}</Text>
        <Text style={[styles.macroUnit, { color: colors.textSubtle }]}>
          {macro.key === 'fiberGrams' ? `${macro.unit} · may stay unknown` : macro.unit}
        </Text>
      </View>
      <TextInput
        accessibilityLabel={`${macro.label} in ${macro.unit}`}
        keyboardType="decimal-pad"
        onChangeText={onChange}
        placeholder="—"
        placeholderTextColor={colors.textSubtle}
        style={[
          styles.macroInput,
          { borderColor: problem === null ? colors.hairline : colors.danger, color: colors.text },
        ]}
        value={text}
      />
      {problem !== null && (
        <Text style={[styles.macroProblem, { color: colors.danger }]}>
          {problemMessage(macro, problem)}
        </Text>
      )}
    </View>
  );
}

function Way({
  colors,
  detail,
  label,
  onPress,
}: {
  colors: ThemeColors;
  detail: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.way,
        { borderColor: colors.hairline },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.wayLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.wayDetail, { color: colors.textMuted }]}>{detail}</Text>
    </Pressable>
  );
}

function Next({
  colors,
  disabled,
  label,
  onPress,
}: {
  colors: ThemeColors;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.next,
        disabled
          ? { borderColor: colors.hairline, borderWidth: 1 }
          : { backgroundColor: colors.accent },
        pressed && styles.pressed,
      ]}>
      <Text
        style={[
          styles.nextText,
          disabled
            ? { color: colors.textSubtle, fontFamily: fontFamily.body }
            : { color: colors.onAccent, fontFamily: fontFamily.semi },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionLabel({ colors, label }: { colors: ThemeColors; label: string }) {
  return <Text style={[styles.sectionLabel, { color: colors.textSubtle }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  back: {
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  backText: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
  },
  body: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerSide: {
    flex: 1,
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
  },
  input: {
    borderRadius: radius.lg,
    borderWidth: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.body,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputTall: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  macroInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    fontFamily: fontFamily.semi,
    fontSize: typography.body,
    minWidth: 92,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: 'right',
  },
  macroLabel: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
  },
  macroLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  macroProblem: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: spacing.xs,
    width: '100%',
  },
  macroRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: spacing.sm,
  },
  macroUnit: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: 1,
  },
  next: {
    alignItems: 'center',
    borderRadius: radius.xl,
    marginTop: spacing.xl,
    paddingVertical: 13,
  },
  nextText: {
    fontSize: typography.bodySmall,
  },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.md,
  },
  noteEcho: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
  },
  pressed: {
    opacity: 0.7,
  },
  question: {
    fontFamily: fontFamily.display,
    fontSize: typography.heroInterpretation,
    lineHeight: lineHeights.heroInterpretation,
  },
  screen: {
    flex: 1,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  secondaryText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
  },
  sectionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xs,
    marginTop: spacing.xl,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.semi,
    fontSize: typography.body,
  },
  warning: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.md,
  },
  way: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  wayDetail: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    marginTop: 2,
  },
  wayLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.body,
  },
});

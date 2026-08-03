import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { findHub, type HubId } from '@/ui/hubs/catalog';
import {
  FOCUS_MAX,
  NAME_MAX,
  draftPreview,
  draftProblem,
  problemMessage,
} from '@/ui/hubs/newHub';
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
 * Making a hub, as a few plain questions rather than a form — the owner's brief was "similar to
 * creating a project in Claude". One question per step, because three labelled fields stacked on a
 * phone read as paperwork, and the point of the flow is that adding a hub feels small.
 *
 * The same flow makes an exercise type: `parentId` is the only difference, and it comes from the
 * route rather than from a question the user has to understand.
 *
 * Nothing is saved. The last step shows what would be made and says so plainly. A flow that quietly
 * dropped a hub the user had just named and described would be worse than one that admits it.
 */

type Step = 'done' | 'focus' | 'name';

export function NewHubFlow({ parentId }: { parentId?: HubId }) {
  const { colors } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [focus, setFocus] = useState('');

  const parent = parentId === undefined ? undefined : findHub(parentId);
  const draft = { focus, name, parentId };
  const problem = draftProblem(draft);
  const thing = parent === undefined ? 'hub' : 'exercise type';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.headerSide}>
          <Link asChild href={parent === undefined ? '/' : `/hub/${parent.id}`}>
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={[styles.backText, { color: colors.textMuted }]}>
                ← {parent === undefined ? 'Home' : parent.label}
              </Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          New {thing}
        </Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 'name' && (
          <>
            <Question
              colors={colors}
              hint={
                parent === undefined
                  ? 'It becomes a circle on the orbit, so short names sit better.'
                  : `It sits inside ${parent.label}, not on the orbit.`
              }
              text={`What is this ${thing} about?`}
            />
            <TextInput
              accessibilityLabel={`Name of the new ${thing}`}
              autoFocus
              maxLength={NAME_MAX + 8}
              onChangeText={setName}
              placeholder={parent === undefined ? 'Hydration' : 'Climbing'}
              placeholderTextColor={colors.textSubtle}
              style={[
                styles.input,
                { borderColor: colors.hairline, color: colors.text },
              ]}
              value={name}
            />
            <Problem colors={colors} message={name.length > 0 && problem !== null ? problemMessage(problem) : undefined} />
            <Next
              colors={colors}
              disabled={name.trim().length === 0 || problem !== null}
              label="Next"
              onPress={() => setStep('focus')}
            />
          </>
        )}

        {step === 'focus' && (
          <>
            <Question
              colors={colors}
              hint="One line. It is what the coach says it is responsible for, and the user reads it before asking anything."
              text={`What should the ${name.trim()} coach focus on?`}
            />
            <TextInput
              accessibilityLabel="What the coach focuses on"
              autoFocus
              maxLength={FOCUS_MAX + 20}
              multiline
              onChangeText={setFocus}
              placeholder="How much you drink, and when."
              placeholderTextColor={colors.textSubtle}
              style={[
                styles.input,
                styles.inputTall,
                { borderColor: colors.hairline, color: colors.text },
              ]}
              value={focus}
            />
            <Problem colors={colors} message={problem === 'focusTooLong' ? problemMessage(problem) : undefined} />
            <Next
              colors={colors}
              disabled={focus.trim().length === 0 || problem !== null}
              label="Next"
              onPress={() => setStep('done')}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('name')}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Back</Text>
            </Pressable>
          </>
        )}

        {step === 'done' && <Summary colors={colors} draft={draft} onHome={() => router.push('/')} />}
      </ScrollView>
    </View>
  );
}

function Summary({
  colors,
  draft,
  onHome,
}: {
  colors: ThemeColors;
  draft: { focus: string; name: string; parentId?: HubId };
  onHome: () => void;
}) {
  const preview = draftPreview(draft);

  return (
    <>
      <Text style={[styles.question, { color: colors.text }]}>{preview.hub.label}</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{preview.where}</Text>

      <SectionLabel colors={colors} label="What this makes" />
      <Row colors={colors} label="Coach" value={preview.coachName} />
      <Row colors={colors} label="Focus" value={draft.focus.trim()} />
      <Row colors={colors} label="Starts with" value="A coach, and notes you write by hand" />
      <Row colors={colors} label="Data" value="Connect a source or upload a file whenever you like" />

      {/* The honest ending. Hubs are seed data and a real store sits behind `src/application/`,
          which a screen may not import — so nothing is saved, and saying so beats pretending. */}
      <Text style={[styles.note, { color: colors.textSubtle }]}>
        Nothing is saved yet — making hubs is not wired up. This is the flow, not the feature.
      </Text>

      <Next colors={colors} disabled={false} label="Back to Home" onPress={onHome} />
    </>
  );
}

function Row({ colors, label, value }: { colors: ThemeColors; label: string; value: string }) {
  return (
    <View style={[styles.row, { borderTopColor: colors.borderSubtle }]}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function Question({ colors, hint, text }: { colors: ThemeColors; hint: string; text: string }) {
  return (
    <>
      <Text style={[styles.question, { color: colors.text }]}>{text}</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
    </>
  );
}

function Problem({ colors, message }: { colors: ThemeColors; message?: string }) {
  if (message === undefined) return null;
  return <Text style={[styles.problem, { color: colors.danger }]}>{message}</Text>;
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
        // Inert is an outline, never a filled surface — a disabled control must not be the
        // brightest thing on the screen, which is what filling it produced on the light theme.
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
  next: {
    alignItems: 'center',
    borderRadius: radius.xl,
    marginTop: spacing.lg,
    paddingVertical: 13,
  },
  nextText: {
    fontSize: typography.bodySmall,
  },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  problem: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    marginTop: spacing.sm,
  },
  question: {
    fontFamily: fontFamily.display,
    fontSize: typography.heroInterpretation,
    lineHeight: lineHeights.heroInterpretation,
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
  },
  rowValue: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    marginTop: 2,
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
});

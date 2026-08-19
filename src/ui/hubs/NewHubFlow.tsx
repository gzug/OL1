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

import { hubs } from '@/application/hubs/hubs';
import { findHub, type HubId } from '@/ui/hubs/catalog';
import { useHubs } from '@/ui/hubs/useHubs';
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
 * **The last step now writes it.** Until 2026-08-19 this flow ended by admitting that nothing was
 * saved, because there was no store — a hub was seed data in a file. There is one now, so the
 * button makes the hub and Home shows it when you get back there.
 *
 * What the ending still admits is where it is kept, because that limit is real: on the web preview
 * a hub lives in this browser and goes when the browser's data is cleared. Saying so is the same
 * honesty the old copy had, pointed at what is true now rather than at what was missing.
 */

type Step = 'done' | 'focus' | 'name';

export function NewHubFlow({ parentId }: { parentId?: HubId }) {
  const { colors } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [focus, setFocus] = useState('');

  /**
   * Every hub that exists, not just the seeded ones — otherwise the second hub you name "Reading"
   * is accepted, and the ring quietly carries two of them.
   */
  const existing = useHubs();
  const parent = parentId === undefined ? undefined : findHub(parentId, existing);
  const draft = { focus, name, parentId };
  const problem = draftProblem(draft, existing);
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

        {step === 'done' && (
          <Summary
            colors={colors}
            draft={draft}
            onCreated={() => router.push('/')}
          />
        )}
      </ScrollView>
    </View>
  );
}

function Summary({
  colors,
  draft,
  onCreated,
}: {
  colors: ThemeColors;
  draft: { focus: string; name: string; parentId?: HubId };
  onCreated: () => void;
}) {
  const preview = draftPreview(draft);
  const [state, setState] = useState<'failed' | 'idle' | 'saving'>('idle');

  async function create() {
    setState('saving');
    try {
      await hubs.create(preview.hub);
      onCreated();
    } catch {
      // The hub is not made, so the screen must not navigate away as if it were. Everything the
      // person typed is still on this screen and the button can be pressed again.
      setState('failed');
    }
  }

  return (
    <>
      <Text style={[styles.question, { color: colors.text }]}>{preview.hub.label}</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{preview.where}</Text>

      <SectionLabel colors={colors} label="What this makes" />
      <Row colors={colors} label="Coach" value={preview.coachName} />
      <Row colors={colors} label="Focus" value={draft.focus.trim()} />
      <Row colors={colors} label="Starts with" value="A coach, and notes you write by hand" />
      <Row colors={colors} label="Data" value="Connect a source or upload a file whenever you like" />

      {/* Where it is kept, which is the part still worth saying out loud. `hubStore.web.ts` says
          the same thing to developers; this says it to the person making the hub. */}
      <Text style={[styles.note, { color: colors.textSubtle }]}>
        {state === 'failed'
          ? 'That could not be saved. Nothing was lost — try again.'
          : 'Kept on this device. In the web preview that means this browser, so clearing your browser data clears it.'}
      </Text>

      <Next
        colors={colors}
        disabled={state === 'saving'}
        label={state === 'saving' ? 'Making it…' : 'Make this hub'}
        onPress={() => void create()}
      />
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

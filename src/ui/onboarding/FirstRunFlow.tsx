import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { hubs } from '@/application/hubs/hubs';
import { answerId, dailyId } from '@/ui/hubs/entryWords';
import {
  plausibleBirthYear,
  plausibleHeightCm,
  profiles as defaultProfiles,
} from '@/application/profile/profile';
import type { Sex } from '@/core/profile';
import { ringPlaceCount, type HubDefinition } from '@/ui/hubs/catalog';
import { mergeHubs } from '@/ui/hubs/mergeHubs';
import { draftId, draftProblem, problemMessage } from '@/ui/hubs/newHub';
import { useHubs } from '@/ui/hubs/useHubs';
import { CENTRE, STAGE, stackBox } from '@/ui/mockup/geometry';
import { Orbit } from '@/ui/mockup/Orbit';
import { BodyFigure } from '@/ui/twin/BodyFigure';
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

import { Typewriter } from './Typewriter';
import {
  COPY,
  GOALS,
  RECORD_KINDS,
  SKIPPED,
  SPORTS,
  STEPS,
  nextStep,
  previousStep,
  stillMissing,
  type Choice,
  type Step,
} from './firstRun';

/**
 * The first minute of OL1.
 *
 * Six beats: a welcome, three answers about you, what you want, what you train, what you have had
 * done, and then the ring you just built. Every one of them is skippable and every answer is
 * editable afterwards — the year and the sex on the Twin under About you, the rest inside the hub
 * it landed in.
 *
 * **Everything here writes for real.** That is the rule the whole screen is built around, and it
 * comes from `docs/audits/2026-07-03-first-run-audit.md` in Legacy: its onboarding asked questions
 * whose answers went nowhere, hardcoded a birth year so the biological age could never compute, and
 * told the user a privacy sentence that was false. So there is no question on any of these cards
 * that does not change something you can go and look at afterwards, and the sentence about where
 * the answers are kept is different on the web preview than on a phone, because the truth is.
 *
 * **The profile is written at the end of the second card, not at the end of the flow.** A person
 * who quits halfway has still given the one answer that unlocks the headline number, and losing it
 * to make the step counter tidy would be the wrong trade.
 */

const SEXES: readonly { id: Sex; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
  { id: 'preferNotToSay', label: 'Rather not say' },
];

export function FirstRunFlow({ source = defaultProfiles }: { source?: typeof defaultProfiles }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { hubs: seeded } = useHubs();

  const [step, setStep] = useState<Step>('welcome');
  const [typed, setTyped] = useState(false);

  const [year, setYear] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  /**
   * Null until somebody taps, and only then a value.
   *
   * It used to start on `preferNotToSay`, which is the right thing to STORE for an unanswered
   * question and the wrong thing to SHOW: a highlighted pill reads as a choice already made, on
   * behalf of somebody who has not answered. The stored value is unchanged — this is only about
   * not putting words in their mouth on screen.
   */
  const [sex, setSex] = useState<Sex | null>(null);

  const [goals, setGoals] = useState<readonly string[]>([]);
  const [otherGoal, setOtherGoal] = useState('');
  const [sports, setSports] = useState<readonly string[]>([]);
  const [otherSport, setOtherSport] = useState('');
  const [conditions, setConditions] = useState('');
  const [held, setHeld] = useState<readonly string[]>([]);
  const [writeFailed, setWriteFailed] = useState(false);
  /**
   * The hubs as they stand AFTER this flow has written to them.
   *
   * `useHubs` re-reads on focus, and the last card arrives without the screen ever losing focus —
   * so the ring drew the seeded seven and left out the hub the person had just made two cards
   * earlier. On a card whose whole claim is "this is what you built", that was the one thing it
   * could not get wrong. Read once on the way in, from the same store, merged the same way.
   */
  const [built, setBuilt] = useState<readonly HubDefinition[] | null>(null);

  /** What the ring is drawn from: the seeded hubs until the flow has written, then what it wrote. */
  const existing = built ?? seeded;
  /** The free space inside the ring, which shrinks as places are added. Same call Home makes. */
  const centreBox = stackBox(ringPlaceCount(existing));

  const today = new Date();
  const birthYear = year.trim().length === 0 ? null : plausibleBirthYear(Number(year.trim()), today);
  const yearIsWrong = year.trim().length > 0 && birthYear === null;
  const heightCm = height.trim().length === 0 ? null : plausibleHeightCm(Number(height.trim()));
  const heightIsWrong = height.trim().length > 0 && heightCm === null;

  const panelComing = held.includes('panel');
  const gaps = stillMissing({
    birthYear,
    heldUnreadable: held.filter((id) => id !== 'panel'),
    panelComing,
  });

  function toggle(list: readonly string[], id: string): readonly string[] {
    return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
  }

  /**
   * Make a hub for something OL1 does not already have, and hand back its id.
   *
   * `draftProblem` is the same guard `/new-hub` uses, against the same live hub list — so a sport
   * typed here cannot collide with one that ships, and cannot be created twice. `newHub.ts` sets a
   * new hub's coach to its own id, which is where the coach in "creates the coaches" comes from.
   */
  async function createFrom(name: string, parentId?: string): Promise<string | null> {
    const draft = { focus: '', name: name.trim(), parentId };
    if (draftProblem(draft, existing) !== null) return null;

    const id = draftId(draft.name);
    /**
     * Exactly these fields and no more. `NewHubFlow` learned this the hard way: a variable carrying
     * extra properties is assignable where a literal is not, so the extras travelled silently, and
     * the web store kept them while SQLite dropped them.
     */
    await hubs.create({
      coachId: id,
      id,
      label: draft.name,
      ...(parentId === undefined ? {} : { parentId }),
    });
    return id;
  }

  async function commitAbout() {
    await source.save(birthYear, sex ?? SKIPPED.sex);
    if (heightCm !== null) await source.saveHeight(heightCm);

    /**
     * A weight is asked for here and filed as a weigh-in, because a weight is a measurement with a
     * date rather than a fact about a person. On the profile it would be whatever was typed today,
     * forever, with nothing to say it had aged.
     */
    const kg = Number(weight.trim());
    if (weight.trim().length > 0 && Number.isFinite(kg) && kg > 20 && kg < 400) {
      /**
       * One weigh-in a day. Walking the first run twice is not two readings of the same weight —
       * it is one, given twice — and it read as "2 weigh-ins" in Nutrition until this was keyed by
       * day. Next week's is genuinely new, because the day is part of the id.
       */
      const today = new Date().toISOString();
      await hubs.add('nutrition', 'weight', { kg: Math.round(kg * 10) / 10 }, {
        id: dailyId('weight', 'nutrition', today),
        recordedAt: today,
      });
    }
  }

  async function commitGoals() {
    for (const goal of GOALS.filter((entry) => goals.includes(entry.id))) {
      /* The same id the settings screen writes, so walking the first run again — or changing the
         answer there — replaces this row rather than adding a second copy of one answer. */
      if (goal.hubId !== undefined) {
        await hubs.add(goal.hubId, 'goal', { label: goal.label }, {
          id: answerId('goal', goal.hubId, goal.label),
        });
      }
    }

    const name = otherGoal.trim();
    if (name.length > 0) {
      const id = await createFrom(name);
      if (id !== null) await hubs.add(id, 'goal', { label: name }, { id: answerId('goal', id, name) });
    }
  }

  async function commitTraining() {
    /**
     * **A named sport is recorded on Exercise, not built as a hub inside it.**
     *
     * It used to create a hub per sport and drop a note in it. Those hubs never received a session
     * — every session goes to `exercise` with the sport as a field on the payload — so they were
     * empty rooms with coaches attached. What naming a sport actually earns you is its coach, and
     * `sportCoachesFor` reads these entries to know which ones you have.
     */
    for (const sport of SPORTS.filter((entry) => sports.includes(entry.id))) {
      await hubs.add('exercise', 'sport', { coachId: sport.coachId, label: sport.label }, {
        id: answerId('sport', 'exercise', sport.coachId),
      });
    }

    const name = otherSport.trim();
    if (name.length > 0) {
      await createFrom(name, 'exercise');
    }
  }

  async function commitRecords() {
    const said = conditions.trim();
    // Verbatim, and no model anywhere near it. What somebody typed about their own health is the
    // one thing here that must come back out exactly as it went in.
    if (said.length > 0) await hubs.add('medical', 'note', { text: said });

    for (const id of held.filter((entry) => entry !== 'panel')) {
      const kind = RECORD_KINDS.find((entry) => entry.id === id);
      if (kind !== undefined) {
        await hubs.add('medical', 'note', {
          text: `Has a ${kind.label.toLowerCase()} result. OL1 cannot read one yet.`,
        });
      }
    }
  }

  /**
   * Move on, whatever the store did.
   *
   * A write that throws must not strand somebody on a card with a button that no longer works —
   * that is a worse failure than the lost answer. So the step advances either way, and the ring
   * card says plainly that something did not save rather than showing a tidy summary of answers
   * that are not there. `NewHubFlow` makes the opposite call for the same reason: it has one
   * answer and can stay put; this has five and cannot.
   */
  async function advance() {
    try {
      if (step === 'about') await commitAbout();
      if (step === 'goals') await commitGoals();
      if (step === 'training') await commitTraining();
      if (step === 'records') await commitRecords();
    } catch {
      setWriteFailed(true);
    }

    const next = nextStep(step);
    if (next === 'ring') {
      try {
        setBuilt(mergeHubs(await hubs.list()));
      } catch {
        // The seeded ring is still true, just incomplete. Better than no ring at all.
      }
    }
    if (next !== null) setStep(next);
  }

  /**
   * What has to be true before this flow is left, by any door.
   *
   * The profile is written even on a skip, because skipping IS an answer: no year, and a sex nobody
   * chose. Without that write the welcome would reappear on every launch, which is a worse answer
   * to "I would rather not" than recording what was actually said. It is only written if nothing is
   * there — a skip on the last card must not overwrite what the second card already saved.
   *
   * Navigation stays at the call sites rather than being passed in here, so every destination is a
   * literal or a template `typedRoutes` can check. A `string` parameter would have made all five of
   * them unverifiable in one move.
   */
  async function finish(): Promise<void> {
    try {
      const stored = await source.read();
      if (stored === null) await source.save(SKIPPED.birthYear, SKIPPED.sex);
    } catch {
      setWriteFailed(true);
    }
  }

  async function done(): Promise<void> {
    await finish();
    router.replace(panelComing ? '/add-panel' : '/');
  }


  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <View style={styles.dots}>
          {STEPS.map((entry) => (
            <View
              key={entry}
              style={[
                styles.dot,
                {
                  backgroundColor: STEPS.indexOf(entry) <= STEPS.indexOf(step) ? colors.accent : colors.hairline,
                  width: entry === step ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>
        {step !== 'ring' && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void finish().then(() => router.replace('/'))}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
            <Text style={[styles.skipText, { color: colors.textSubtle }]}>{COPY.skip}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 'welcome' && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setTyped(true)}
            style={styles.welcome}>
            <Typewriter
              complete={typed}
              style={[styles.hero, { color: colors.text }]}
              text={COPY.welcome}
            />
          </Pressable>
        )}

        {step === 'about' && (
          <View>
            <Heading colors={colors} hint={COPY.aboutHint} title={COPY.aboutTitle} />

            <Field colors={colors} label={COPY.yearLabel}>
              <TextInput
                inputMode="numeric"
                maxLength={4}
                onChangeText={(value) => setYear(value.replace(/[^0-9]/g, ''))}
                placeholder="1982"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
                value={year}
              />
            </Field>
            {yearIsWrong && <Problem colors={colors} text={COPY.yearWrong} />}

            <Field colors={colors} label={COPY.heightLabel}>
              <TextInput
                inputMode="numeric"
                maxLength={3}
                onChangeText={(value) => setHeight(value.replace(/[^0-9]/g, ''))}
                placeholder="178"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
                value={height}
              />
            </Field>
            {heightIsWrong && <Problem colors={colors} text={COPY.heightWrong} />}

            <Field colors={colors} label={COPY.weightLabel}>
              <TextInput
                inputMode="decimal"
                maxLength={5}
                onChangeText={(value) => setWeight(value.replace(/[^0-9.]/g, ''))}
                placeholder="76"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
                value={weight}
              />
            </Field>
            <Text style={[styles.hint, { color: colors.textSubtle }]}>{COPY.weightNote}</Text>

            <Field colors={colors} label={COPY.sexLabel}>
              <Pills
                colors={colors}
                onToggle={(id) => setSex(id as Sex)}
                options={SEXES.map((entry) => ({ id: entry.id, label: entry.label }))}
                selected={sex === null ? [] : [sex]}
              />
            </Field>
            <Text style={[styles.hint, { color: colors.textSubtle }]}>{COPY.sexOnlyMale}</Text>
          </View>
        )}

        {step === 'goals' && (
          <View>
            <Heading colors={colors} hint={COPY.goalsHint} title={COPY.goalsTitle} />
            <Pills
              colors={colors}
              onToggle={(id) => setGoals((current) => toggle(current, id))}
              options={GOALS}
              selected={goals}
            />
            <OtherField
              colors={colors}
              existing={existing}
              label={COPY.goalsOther}
              onChange={setOtherGoal}
              placeholder="Learning to sleep without a phone"
              value={otherGoal}
            />
          </View>
        )}

        {step === 'training' && (
          <View>
            <Heading colors={colors} hint={COPY.trainingHint} title={COPY.trainingTitle} />
            <Pills
              colors={colors}
              onToggle={(id) => setSports((current) => toggle(current, id))}
              options={SPORTS}
              selected={sports}
            />
            <OtherField
              colors={colors}
              existing={existing}
              label={COPY.trainingOther}
              onChange={setOtherSport}
              placeholder="Padel, climbing, rowing…"
              value={otherSport}
            />
          </View>
        )}

        {step === 'records' && (
          <View>
            <Heading colors={colors} hint={COPY.recordsHint} title={COPY.recordsTitle} />

            <Field colors={colors} label={COPY.conditionsLabel}>
              <TextInput
                multiline
                onChangeText={setConditions}
                placeholder={COPY.conditionsPlaceholder}
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, styles.multiline, { borderColor: colors.hairline, color: colors.text }]}
                value={conditions}
              />
            </Field>

            <Text style={[styles.fieldLabel, { color: colors.textSubtle }, styles.recordsLabel]}>
              {COPY.recordsHeld}
            </Text>
            <View style={styles.records}>
              {RECORD_KINDS.map((kind) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: held.includes(kind.id) }}
                  key={kind.id}
                  onPress={() => setHeld((current) => toggle(current, kind.id))}
                  style={({ pressed }) => [
                    styles.record,
                    {
                      backgroundColor: held.includes(kind.id) ? colors.accentSoft : 'transparent',
                      borderColor: held.includes(kind.id) ? colors.accentBorder : colors.hairline,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <Text
                    style={[
                      styles.recordLabel,
                      { color: held.includes(kind.id) ? colors.accent : colors.text },
                    ]}>
                    {kind.label}
                  </Text>
                  <Text style={[styles.recordNote, { color: colors.textMuted }]}>{kind.note}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 'ring' && (
          <View style={styles.ringBlock}>
            <Heading colors={colors} hint={COPY.ringHint} title={COPY.ringTitle} />

            <View style={styles.stageWrapper}>
              <View style={styles.stage}>
                <Orbit
                  hubs={existing}
                  onAddPress={() => void finish().then(() => router.replace('/new-hub'))}
                  onHubPress={(id) => void finish().then(() => router.replace(`/hub/${id}`))}
                  selected={[]}
                  selecting={false}
                />

                {/* The centre, drawn as Home draws it. The caption underneath calls this the
                    Digital Twin, and pointing at an empty circle while saying so is the same
                    species of claim-without-a-subject the first-run audit ended on. No load: a
                    person who has logged nothing has a grey figure, which is the truth. */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.centre,
                    {
                      height: centreBox.height,
                      left: CENTRE - centreBox.width / 2,
                      top: CENTRE - centreBox.height / 2,
                      width: centreBox.width,
                    },
                  ]}>
                  <BodyFigure loads={{}} scale={0.22} showCaption={false} />
                  <Text style={[styles.centreName, { color: colors.text }]}>{'Digital Twin'}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.hint, { color: colors.textMuted }]}>{COPY.ringCentre}</Text>

            {gaps.length > 0 && (
              <View style={styles.gaps}>
                {gaps.map((gap) => (
                  <View key={gap.subject} style={[styles.gap, { borderColor: colors.hairline }]}>
                    <Text style={[styles.gapSubject, { color: colors.text }]}>{gap.subject}</Text>
                    <Text style={[styles.gapCause, { color: colors.textMuted }]}>{gap.cause}</Text>
                  </View>
                ))}
              </View>
            )}

            {writeFailed && (
              <Text style={[styles.problem, { color: colors.warning }]}>{COPY.writeFailed}</Text>
            )}

            <Text style={[styles.storage, { color: colors.textSubtle }]}>
              {Platform.OS === 'web' ? COPY.storageWeb : COPY.storageNative}
            </Text>
            <Text style={[styles.storage, { color: colors.textSubtle }]}>{COPY.noAccount}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        {previousStep(step) !== null && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setStep(previousStep(step) as Step)}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={[styles.backText, { color: colors.textSubtle }]}>{'← Back'}</Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => void (step === 'ring' ? done() : advance())}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: colors.accent },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.primaryText, { color: colors.onAccent }]}>
            {step === 'ring' ? (panelComing ? 'Add your blood panel' : COPY.ready) : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Heading({ colors, hint, title }: { colors: ThemeColors; hint: string; title: string }) {
  return (
    <View style={styles.headingBlock}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
    </View>
  );
}

function Field({
  children,
  colors,
  label,
}: {
  children: ReactNode;
  colors: ThemeColors;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{label}</Text>
      {children}
    </View>
  );
}

function Problem({ colors, text }: { colors: ThemeColors; text: string }) {
  return <Text style={[styles.problem, { color: colors.warning }]}>{text}</Text>;
}

function Pills({
  colors,
  onToggle,
  options,
  selected,
}: {
  colors: ThemeColors;
  onToggle: (id: string) => void;
  options: readonly Choice[];
  selected: readonly string[];
}) {
  return (
    <View style={styles.pills}>
      {options.map((option) => {
        const on = selected.includes(option.id);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            key={option.id}
            onPress={() => onToggle(option.id)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: on ? colors.accentSoft : 'transparent',
                borderColor: on ? colors.accentBorder : colors.hairline,
              },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.pillText, { color: on ? colors.accent : colors.textMuted }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The free-text answer, and the only place in the flow that creates a hub.
 *
 * It shows the same refusal `/new-hub` shows, live, rather than accepting the name and silently
 * dropping it on continue — a name that collides with a hub that already ships is the common case
 * here, not an edge one.
 */
function OtherField({
  colors,
  existing,
  label,
  onChange,
  placeholder,
  value,
}: {
  colors: ThemeColors;
  existing: readonly HubDefinition[];
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const problem = value.trim().length === 0 ? null : draftProblem({ focus: '', name: value }, existing);

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{label}</Text>
      <TextInput
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
        value={value}
      />
      {problem !== null && <Problem colors={colors} text={problemMessage(problem)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { paddingVertical: spacing.sm },
  backText: { fontFamily: fontFamily.body, fontSize: typography.caption },
  body: { paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  centre: { alignItems: 'center', justifyContent: 'center', position: 'absolute' },
  centreName: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  bottom: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  dot: { borderRadius: 3, height: 6 },
  dots: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  field: { marginTop: spacing.md },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xs,
  },
  gap: { borderLeftWidth: 2, marginTop: spacing.sm, paddingLeft: spacing.md },
  gapCause: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: 2,
  },
  gaps: { marginTop: spacing.lg },
  gapSubject: { fontFamily: fontFamily.semi, fontSize: typography.bodySmall },
  headingBlock: { marginBottom: spacing.sm },
  hero: { fontFamily: fontFamily.serif, fontSize: 34, lineHeight: 42, textAlign: 'center' },
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
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  pillText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  pressed: { opacity: 0.6 },
  primary: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
  primaryText: { fontFamily: fontFamily.semi, fontSize: typography.bodySmall },
  problem: { fontFamily: fontFamily.body, fontSize: typography.caption, marginTop: spacing.xs },
  record: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  recordLabel: { fontFamily: fontFamily.semi, fontSize: typography.bodySmall },
  recordNote: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: 2,
  },
  records: { gap: spacing.sm, marginTop: spacing.sm },
  recordsLabel: { marginTop: spacing.lg },
  ringBlock: { alignItems: 'stretch' },
  screen: { flex: 1, justifyContent: 'space-between' },
  skip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  skipText: { fontFamily: fontFamily.body, fontSize: typography.caption },
  stage: { height: STAGE, width: STAGE },
  stageWrapper: { alignItems: 'center', marginTop: spacing.sm },
  storage: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  title: { fontFamily: fontFamily.heading, fontSize: typography.heroInterpretation },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  welcome: { alignItems: 'center', justifyContent: 'center', minHeight: 320 },
});

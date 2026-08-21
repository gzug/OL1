import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { hubs } from '@/application/hubs/hubs';
import { ALTERNATE_UNIT, boundsIn } from '@/application/labs/units';
import {
  LEVINE_MARKERS,
  filledCount,
  isValidTestDate,
  markerProblem,
  panelPayload,
  panelProblems,
  problemMessage,
  type LabSource,
  type MarkerDefinition,
  type MarkerEntry,
} from '@/ui/labs/levine';
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
import { EXTRA_MARKERS } from '@/ui/labs/lipids';

/**
 * Getting a lab report in, the way Legacy does it.
 *
 * Legacy's `LabVerificationScreen` (945 lines) exists for one reason worth copying above all the
 * rest: **extracted values are never trusted**. A panel is stored `isApproved = false` and reaches
 * nothing until the user has looked at every marker. Legacy calls it the Verification Gate, and it
 * sits behind OCR; it has to sit behind a vision model too, which is strictly less predictable.
 *
 * So this is two steps, not one. Choosing a photo or a file does not import anything — it lands you
 * in the same review table that entering by hand does, with the fields empty because nothing is
 * reading them yet. That is honest about today AND the shape the real thing keeps: the reviewer is
 * the point, and the extractor only ever pre-fills what the reviewer confirms.
 *
 * The nine markers, their units and their sanity ranges are ported from Legacy's `labSchema.ts`.
 * The ranges are the Clinical Safety Gate: they catch a misread unit, and they say nothing whatever
 * about whether a value is healthy.
 */

/**
 * Today, from the device rather than from this file.
 *
 * **It used to be the string `'2026-08-03'`**, which was true on the day it was typed and wrong
 * every day after. By 21 August any genuine draw date from the 4th onward was rejected as being in
 * the future, the Approve button went dead with nothing on screen connecting it to the date field,
 * and a person's only way forward was to clear the date — which is exactly the state that used to
 * stamp the panel with the moment they pressed the button.
 *
 * A frozen clock is not a small bug in a lab form. It gets worse by one day, every day, and it
 * pushes people into the failure below it.
 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LabUploadFlow() {
  const { colors } = useTheme();
  const [source, setSource] = useState<LabSource | null>(null);
  const [testDate, setTestDate] = useState('');
  const [entries, setEntries] = useState<readonly MarkerEntry[]>(
    [...LEVINE_MARKERS, ...EXTRA_MARKERS].map((marker) => ({ key: marker.key, text: '' })),
  );
  /**
   * The extra markers are folded away until asked for.
   *
   * A panel screen that opens with seventeen fields is a form, and the nine are the ones the
   * biological age needs — putting a lipid profile beside them at equal weight would suggest a
   * fuller panel produces a more certain number. It does not: `computePhenoAgeRange` reads exactly
   * nine keys and ignores the rest.
   */
  const [showExtra, setShowExtra] = useState(false);
  const [state, setState] = useState<'approved' | 'failed' | 'idle' | 'saving'>('idle');
  /** Which unit each marker is being typed in. Defaults to the one the formula reads. */
  const [units, setUnits] = useState<Record<string, string>>({});

  const problems = panelProblems(entries, units, [...LEVINE_MARKERS, ...EXTRA_MARKERS]);
  /* The nine only — the label beside it says "of 9", and a lipid filled in is not one of them. */
  const filled = filledCount(entries);
  const extrasFilled = filledCount(entries, EXTRA_MARKERS);
  /**
   * **The draw date is required, and the blank escape is gone.**
   *
   * It used to read `testDate.trim().length === 0 || …`, so a panel could be approved with no date
   * at all — and `approve()` then omitted `recordedAt`, which the store defaults to now. The
   * comment inside `approve()` states the rule this broke: a panel is dated by when the blood was
   * DRAWN, not by when it was typed in.
   *
   * That default was not a caption problem. Panels are sorted by this date, and three screens read
   * whichever is newest — so a panel from March, entered this afternoon, silently became "your
   * latest results" and the biological age was computed against it.
   */
  const dateGiven = testDate.trim().length > 0;
  const dateOk = dateGiven && isValidTestDate(testDate.trim(), today());
  const canApprove = filled > 0 && problems.length === 0 && dateOk;

  async function approve() {
    if (source === null) return;
    setState('saving');
    try {
      /**
       * The panel is dated by when the blood was DRAWN, not by when it was typed in. A panel
       * entered months later belongs to the day it was taken — the drift number and every "since
       * your last panel" line read this field, and both would be wrong the other way round.
       */
      // `canApprove` already required it, so this is always a real draw date and never a default.
      const drawn = `${testDate.trim()}T00:00:00.000Z`;
      /**
       * **`source: 'manual'`, because every value on this panel was typed.**
       *
       * It used to pass `source` — the route chosen on the first step — so a panel reached through
       * "Take a photo" was filed as `photo` and reported as "photographed" in `StoredEntries` and
       * in the Twin's ledger. Nothing in this app reads an image; the next step says so itself
       * ("Reading the report is not built yet, so the fields start empty") and then the numbers are
       * typed. `panelPayload` already keeps the route as `readBy`, which is the honest place for
       * it: what somebody chose, not what the app did.
       */
      await hubs.add(
        'labs',
        'panel',
        panelPayload(entries, source, new Date().toISOString(), units, [
          ...LEVINE_MARKERS,
          ...EXTRA_MARKERS,
        ]),
        {
          recordedAt: drawn,
          source: 'manual',
        },
      );
      setState('approved');
    } catch {
      // Every value is still on screen. Losing a hand-typed panel to a failed write would be the
      // worst thing this screen could do.
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
          <Link asChild href="/hub/labs">
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={[styles.backText, { color: colors.textMuted }]}>← Labs</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Add a panel</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {source === null ? (
          <>
            <Text style={[styles.question, { color: colors.text }]}>
              How is your report arriving?
            </Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Every route ends in the same place: you check each value before anything is kept.
            </Text>

            <Way
              colors={colors}
              detail="A picture of the printed panel."
              label="Take a photo"
              onPress={() => setSource('photo')}
            />
            <Way
              colors={colors}
              detail="A PDF or an image already on your phone."
              label="Choose a file"
              onPress={() => setSource('file')}
            />
            <Way
              colors={colors}
              detail="Type the nine values yourself."
              label="Enter by hand"
              onPress={() => setSource('manual')}
            />
          </>
        ) : (
          <>
            <Text style={[styles.question, { color: colors.text }]}>Check every value</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {source === 'manual'
                ? 'Skip anything your panel does not include.'
                : 'Reading the report is not built yet, so the fields start empty. Nothing is kept until you approve it.'}
            </Text>

            <SectionLabel colors={colors} label="When was it drawn" />
            <TextInput
              accessibilityLabel="Date the panel was drawn"
              keyboardType="numbers-and-punctuation"
              onChangeText={setTestDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
              value={testDate}
            />
            {/* Two different problems, said differently. A blank field is not a malformed one, and
                telling somebody their empty box is badly formatted is how a form stops being
                answerable. */}
            {!dateGiven && (
              <Text style={[styles.problem, { color: colors.textSubtle }]}>
                Needed. Every screen that shows this panel says when the blood was taken, so it
                cannot be guessed.
              </Text>
            )}
            {dateGiven && !dateOk && (
              <Text style={[styles.problem, { color: colors.danger }]}>
                Use YYYY-MM-DD, and not a date in the future.
              </Text>
            )}

            <SectionLabel colors={colors} label={`Markers · ${filled} of 9 filled`} />
            {LEVINE_MARKERS.map((marker) => (
              <MarkerRow
                colors={colors}
                key={marker.key}
                marker={marker}
                onChange={(text) => setEntry(marker.key, text)}
                onUnitChange={(unit) => setUnits((current) => ({ ...current, [marker.key]: unit }))}
                text={entries.find((entry) => entry.key === marker.key)?.text ?? ''}
                unit={units[marker.key] ?? marker.unit}
              />
            ))}

            {/**
              * Everything else the report carries.
              *
              * **Folded away, and the sentence says why rather than leaving it to be inferred.** A
              * panel with a full lipid profile on it does not make the biological age more certain
              * — the formula reads exactly nine keys — and a screen that put seventeen fields at
              * equal weight would quietly claim otherwise.
              */}
            {!showExtra && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowExtra(true)}
                style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
                <Text style={[styles.moreText, { color: colors.accent }]}>
                  {extrasFilled > 0
                    ? `Also on your report · ${extrasFilled} filled`
                    : 'Add the rest of your panel'}
                </Text>
              </Pressable>
            )}

            {showExtra && (
              <>
                <SectionLabel colors={colors} label="Also on your report" />
                <Text style={[styles.note, { color: colors.textSubtle }]}>
                  Recorded and shown, and not part of the biological age — that reads the nine
                  above and nothing else.
                </Text>
                {EXTRA_MARKERS.map((marker) => (
                  <MarkerRow
                    colors={colors}
                    key={marker.key}
                    marker={marker}
                    onChange={(text) => setEntry(marker.key, text)}
                    onUnitChange={(unit) =>
                      setUnits((current) => ({ ...current, [marker.key]: unit }))
                    }
                    text={entries.find((entry) => entry.key === marker.key)?.text ?? ''}
                    unit={units[marker.key] ?? marker.unit}
                  />
                ))}
              </>
            )}

            {/* The gate. Legacy stores a panel `isApproved = false` and lets it reach nothing until
                this is pressed — the reviewer is the feature, not the extractor. */}
            <Pressable
              accessibilityRole="button"
              disabled={!canApprove || state === 'saving'}
              onPress={() => void approve()}
              style={({ pressed }) => [
                styles.approve,
                canApprove
                  ? { backgroundColor: colors.accent }
                  : { borderColor: colors.hairline, borderWidth: 1 },
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.approveText,
                  canApprove
                    ? { color: colors.onAccent, fontFamily: fontFamily.semi }
                    : { color: colors.textSubtle, fontFamily: fontFamily.body },
                ]}>
                {problems.length > 0
                  ? `${problems.length} value${problems.length === 1 ? '' : 's'} to fix`
                  : filled === 0
                    ? 'Fill at least one marker'
                    : state === 'saving'
                      ? 'Saving…'
                      : state === 'approved'
                        ? 'Approved'
                        : `Approve ${filled} marker${filled === 1 ? '' : 's'}`}
              </Text>
            </Pressable>

            {state === 'approved' && (
              <Text style={[styles.note, { color: colors.textSubtle }]}>
                Kept in Labs, inside Health record. Markers you left blank stay unknown — which
                is what lets the age calculation give a range instead of a number it cannot stand
                behind.
              </Text>
            )}
            {state === 'failed' && (
              <Text style={[styles.note, { color: colors.warning }]}>
                That could not be saved. Nothing was lost — every value is still here, try again.
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => setSource(null)}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Start again</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * One marker, in whichever unit the laboratory printed.
 *
 * **This is the most likely way the whole calculation goes wrong.** Levine's formula takes American
 * units; a European panel reports albumin in `g/L`, creatinine in `µmol/L` and glucose in `mmol/L`.
 * Typed raw those are out by factors of ten, eighty-eight and eighteen, and the resulting biological
 * age is confidently wrong rather than obviously wrong.
 *
 * The sanity ranges would catch all three — 45 g/L reads as impossible in `g/dL` — but "outside
 * 1–7" does not tell somebody holding a German lab report what to do about it. So where a second
 * unit exists it is offered, the range is restated in whatever is selected, and the conversion
 * happens on the way to storage. What is stored is always the unit the formula reads.
 */
function MarkerRow({
  colors,
  marker,
  onChange,
  onUnitChange,
  text,
  unit,
}: {
  colors: ThemeColors;
  marker: MarkerDefinition;
  onChange: (text: string) => void;
  onUnitChange: (unit: string) => void;
  text: string;
  unit: string;
}) {
  const problem = markerProblem(marker, text, unit);
  /* Whichever table owns this marker. A row does not care which side of the split it is on. */
  const alternate = alternateUnitFor(marker.key);
  const shown = boundsFor(marker, unit) ?? marker.sane;

  return (
    <View style={[styles.markerRow, { borderTopColor: colors.borderSubtle }]}>
      <View style={styles.markerLeft}>
        <Text style={[styles.markerLabel, { color: colors.text }]}>{marker.label}</Text>

        {alternate === undefined ? (
          <Text style={[styles.markerUnit, { color: colors.textSubtle }]}>{marker.unit}</Text>
        ) : (
          <View style={styles.unitToggle}>
            {[marker.unit, alternate].map((option) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: unit === option }}
                key={option}
                onPress={() => onUnitChange(option)}
                style={({ pressed }) => [
                  styles.unitOption,
                  {
                    backgroundColor: unit === option ? colors.accentSoft : 'transparent',
                    borderColor: unit === option ? colors.accentBorder : colors.hairline,
                  },
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.unitOptionText,
                    { color: unit === option ? colors.accent : colors.textSubtle },
                  ]}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.markerRange, { color: colors.textSubtle }]}>
          {shown.min}–{shown.max}
        </Text>
      </View>
      <TextInput
        accessibilityLabel={`${marker.label} in ${unit}`}
        keyboardType="decimal-pad"
        onChangeText={onChange}
        placeholder="—"
        placeholderTextColor={colors.textSubtle}
        style={[
          styles.markerInput,
          {
            borderColor: problem === null ? colors.hairline : colors.danger,
            color: colors.text,
          },
        ]}
        value={text}
      />
      {problem !== null && (
        <Text style={[styles.markerProblem, { color: colors.danger }]}>
          {problemMessage(marker, problem)}
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

function SectionLabel({ colors, label }: { colors: ThemeColors; label: string }) {
  return <Text style={[styles.sectionLabel, { color: colors.textSubtle }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  approve: {
    alignItems: 'center',
    borderRadius: radius.xl,
    marginTop: spacing.xl,
    paddingVertical: 13,
  },
  approveText: {
    fontSize: typography.bodySmall,
  },
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  markerInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    fontFamily: fontFamily.semi,
    fontSize: typography.body,
    minWidth: 92,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: 'right',
  },
  markerLabel: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
  },
  markerLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  markerProblem: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: spacing.xs,
    width: '100%',
  },
  markerRange: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: 2,
  },
  unitOption: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  unitOptionText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
  },
  unitToggle: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 3,
  },
  markerRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: spacing.sm,
  },
  markerUnit: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: 1,
  },
  more: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.md,
  },
  moreText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodySmall,
  },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.md,
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

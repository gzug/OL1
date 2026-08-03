import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  LEVINE_MARKERS,
  filledCount,
  isValidTestDate,
  markerProblem,
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

const TODAY = '2026-08-03';

export function LabUploadFlow() {
  const { colors } = useTheme();
  const [source, setSource] = useState<LabSource | null>(null);
  const [testDate, setTestDate] = useState('');
  const [entries, setEntries] = useState<readonly MarkerEntry[]>(
    LEVINE_MARKERS.map((marker) => ({ key: marker.key, text: '' })),
  );
  const [approved, setApproved] = useState(false);

  const problems = panelProblems(entries);
  const filled = filledCount(entries);
  const dateOk = testDate.trim().length === 0 || isValidTestDate(testDate.trim(), TODAY);
  const canApprove = filled > 0 && problems.length === 0 && dateOk;

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
              placeholder="2026-03-12"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
              value={testDate}
            />
            {!dateOk && (
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
                text={entries.find((entry) => entry.key === marker.key)?.text ?? ''}
              />
            ))}

            {/* The gate. Legacy stores a panel `isApproved = false` and lets it reach nothing until
                this is pressed — the reviewer is the feature, not the extractor. */}
            <Pressable
              accessibilityRole="button"
              disabled={!canApprove}
              onPress={() => setApproved(true)}
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
                    : `Approve ${filled} marker${filled === 1 ? '' : 's'}`}
              </Text>
            </Pressable>

            {approved && (
              <Text style={[styles.note, { color: colors.textSubtle }]}>
                Nothing is saved yet — storing panels is not wired up. This is the gate, not the
                feature.
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

function MarkerRow({
  colors,
  marker,
  onChange,
  text,
}: {
  colors: ThemeColors;
  marker: MarkerDefinition;
  onChange: (text: string) => void;
  text: string;
}) {
  const problem = markerProblem(marker, text);

  return (
    <View style={[styles.markerRow, { borderTopColor: colors.borderSubtle }]}>
      <View style={styles.markerLeft}>
        <Text style={[styles.markerLabel, { color: colors.text }]}>{marker.label}</Text>
        <Text style={[styles.markerUnit, { color: colors.textSubtle }]}>{marker.unit}</Text>
      </View>
      <TextInput
        accessibilityLabel={`${marker.label} in ${marker.unit}`}
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

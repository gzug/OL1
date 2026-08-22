import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { LEVINE_MARKERS, isLevineKey } from '@/ui/labs/levine';
import { formatMeasured } from '@/application/format/metric';
import { LIPID_READING_CAVEAT, lipidReadings } from '@/application/labs/lipidReadings';
import { EXTRA_MARKERS } from '@/ui/labs/lipids';
import { markerContext } from '@/ui/labs/markerContext';
import { fontFamily, lineHeights, radius, spacing, tracking, typography, useTheme } from '@/ui/theme';

/**
 * The nine markers on your panel, and what each one is.
 *
 * `markerContext.ts` has carried plain-language copy for all nine since it was ported, with
 * `tests/marker-context.test.ts` mechanically enforcing Legacy's four rules — no diagnosis, no
 * treatment advice, no "you should", no risk prediction. **None of it had ever been rendered.** This
 * is the surface it was written for.
 *
 * **No reference ranges, and that is the decision rather than an omission.** `REFERENCE_BOUNDS` says
 * of itself that it is not a verdict on any value and nothing may render it as one — a value shown
 * beside a range is read as inside or outside it, which is a judgement this app does not make and a
 * laboratory already printed on the report. What is added here is what the marker IS, which the
 * report does not say.
 */
export function YourMarkers({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const [markers, setMarkers] = useState<Record<string, number> | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries('labs')
        .then((entries) => {
          if (cancelled) return;
          const panel = entries
            .filter((entry) => entry.kind === 'panel')
            .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

          const found = panel?.payload.markers;
          setMarkers(
            typeof found === 'object' && found !== null ? (found as Record<string, number>) : null,
          );
        })
        .catch(() => {
          // Nothing rather than a marker list this cannot stand behind.
        });

      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  if (markers === null) return null;

  const present = LEVINE_MARKERS.filter((marker) => typeof markers[marker.key] === 'number');
  /**
   * The markers the age calculation does not read, in their own block below the nine.
   *
   * **Separated rather than merged, and the heading says why.** One list would suggest a fuller
   * panel produces a more certain number — `computePhenoAgeRange` reads exactly nine keys and
   * ignores the rest. Absent entirely when a panel carries none, which is most panels.
   */
  const extras = EXTRA_MARKERS.filter((marker) => typeof markers[marker.key] === 'number');
  /** Arithmetic on the rows above. Empty unless the panel carries both halves of it. */
  const readings = lipidReadings(markers);
  if (present.length === 0) return null;

  const absent = LEVINE_MARKERS.filter((marker) => typeof markers[marker.key] !== 'number');

  return (
    <View style={styles.block}>
      <Text style={[styles.heading, { color: colors.textSubtle }]}>YOUR MARKERS</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {present.map((marker, index) => {
          /* Context is written for the nine. A lipid carries its own `what` instead — see
             `lipids.ts` — and a marker with neither simply does not expand. */
          const context = isLevineKey(marker.key) ? markerContext(marker.key) : undefined;
          const isOpen = open === marker.key;

          return (
            <Fragment key={marker.key}>
              {index > 0 && <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />}
              <Pressable
                accessibilityRole="button"
                onPress={() => setOpen(isOpen ? null : marker.key)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Text style={[styles.label, { color: colors.text }]}>{marker.label}</Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {formatMeasured(markers[marker.key] as number, marker.unit)}
                </Text>
              </Pressable>
              {isOpen && context !== undefined && (
                <View style={styles.context}>
                  <Text style={[styles.what, { color: colors.textMuted }]}>{context.what}</Text>
                  {/* Why it is on THIS panel — because a published age calculation reads it, not
                      because anyone judged it one of the nine most interesting numbers in blood. */}
                  <Text style={[styles.why, { color: colors.textSubtle }]}>{context.why}</Text>
                  <Text style={[styles.alongsideLabel, { color: colors.textSubtle }]}>
                    READ ALONGSIDE
                  </Text>
                  <Text style={[styles.why, { color: colors.textSubtle }]}>{context.alongside}</Text>
                </View>
              )}
            </Fragment>
          );
        })}
      </View>

      {extras.length > 0 && (
        <>
          <Text style={[styles.heading, styles.extraHeading, { color: colors.textSubtle }]}>
            ALSO ON THIS PANEL
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {extras.map((marker, index) => {
              const isOpen = open === marker.key;

              return (
                <Fragment key={marker.key}>
                  {index > 0 && (
                    <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setOpen(isOpen ? null : marker.key)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                    <Text style={[styles.label, { color: colors.text }]}>{marker.label}</Text>
                    <Text style={[styles.value, { color: colors.text }]}>
                      {formatMeasured(markers[marker.key] as number, marker.unit)}
                    </Text>
                  </Pressable>
                  {isOpen && (
                    <View style={styles.context}>
                      <Text style={[styles.what, { color: colors.textMuted }]}>{marker.what}</Text>
                      <Text style={[styles.why, { color: colors.textSubtle }]}>{marker.why}</Text>
                      <Text style={[styles.alongsideLabel, { color: colors.textSubtle }]}>
                        READ ALONGSIDE
                      </Text>
                      <Text style={[styles.why, { color: colors.textSubtle }]}>
                        {marker.alongside}
                      </Text>
                    </View>
                  )}
                </Fragment>
              );
            })}
          </View>
          <Text style={[styles.absent, { color: colors.textSubtle }]}>
            These are recorded because you measure them. The biological age on your Twin reads the
            nine and nothing else, so a fuller panel does not make it more certain.
          </Text>

          {/* Subtraction and division on the two rows above, and nothing more — no cohort, no
              coefficient, no cutoff. `docs/decisions/0015` is the line and what it refuses. */}
          {readings.length > 0 && (
            <>
              <Text style={[styles.heading, styles.extraHeading, { color: colors.textSubtle }]}>
                WORKED OUT FROM THOSE
              </Text>
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                {readings.map((reading, index) => (
                  <Fragment key={reading.key}>
                    {index > 0 && (
                      <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />
                    )}
                    <View style={styles.row}>
                      <Text style={[styles.label, { color: colors.text }]}>{reading.label}</Text>
                      <Text style={[styles.value, { color: colors.text }]}>
                        {formatMeasured(reading.value, reading.unit)}
                      </Text>
                    </View>
                    <Text style={[styles.why, { color: colors.textSubtle }]}>{reading.what}</Text>
                  </Fragment>
                ))}
              </View>
              <Text style={[styles.absent, { color: colors.textSubtle }]}>
                {LIPID_READING_CAVEAT}
              </Text>
            </>
          )}
        </>
      )}

      {absent.length > 0 && (
        <Text style={[styles.absent, { color: colors.textSubtle }]}>
          Not on this panel: {absent.map((marker) => marker.label).join(', ')}.
        </Text>
      )}

      <Text style={[styles.absent, { color: colors.textSubtle }]}>
        Tap a marker to see what it is. No ranges here — your report has those, and a value shown
        beside one gets read as a verdict.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  absent: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  alongsideLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginTop: spacing.xs,
  },
  block: { marginBottom: spacing.md, marginTop: spacing.lg },
  extraHeading: { marginTop: spacing.lg },
  card: { borderRadius: radius.md, paddingHorizontal: spacing.md },
  context: { paddingBottom: spacing.sm, gap: spacing.xs },
  heading: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.sm,
  },
  label: { flexShrink: 1, fontFamily: fontFamily.body, fontSize: typography.bodySmall },
  pressed: { opacity: 0.6 },
  row: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rule: { height: StyleSheet.hairlineWidth },
  value: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  what: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
  },
  why: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
  },
});

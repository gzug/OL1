import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { formatMeasured } from '@/application/format/metric';
import { hubs as defaultHubs } from '@/application/hubs/hubs';
import {
  PANELS_FOR_A_LINE,
  journeyMove,
  markerJourneys,
  type MarkerJourney as Journey,
} from '@/application/labs/markerJourney';
import { sparkline } from '@/application/labs/sparkline';
import { LEVINE_MARKERS } from '@/ui/labs/levine';
import { EXTRA_MARKERS } from '@/ui/labs/lipids';
import { fontFamily, lineHeights, radius, spacing, tracking, typography, useTheme } from '@/ui/theme';

/**
 * One marker, across every panel you have.
 *
 * **Three panels before a line is drawn.** `panelChange.ts` already establishes that two panels are
 * a line and not a trend, and a sparkline through two points makes exactly the claim that rule
 * refuses — in a shape people read faster than they read a sentence. Below three, the two numbers
 * and the words in *What changed* are the honest version.
 *
 * **No reference ranges, no colour by value.** A line that turns red below a threshold is a verdict,
 * and the laboratory already printed its own ranges on the report. What is added here is the shape
 * over time, which the report cannot show.
 */

/**
 * How a direction across the whole journey reads.
 *
 * Written out rather than assembled from a conditional and a shared ending: "higher than the first"
 * and "about the same as the first" do not take the same preposition, and one template producing
 * both printed "about the same than the first" on the deployed page.
 */
function moveSentence(move: 'down' | 'level' | 'up'): string {
  switch (move) {
    case 'down':
      return 'lower than the first';
    case 'level':
      return 'about the same as the first';
    case 'up':
      return 'higher than the first';
  }
}

const NAME: Readonly<Record<string, string>> = Object.fromEntries(
  [...LEVINE_MARKERS, ...EXTRA_MARKERS].map((marker) => [marker.key, marker.label]),
);

const WIDTH = 96;
const HEIGHT = 30;

export function MarkerJourney({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  /** `null` until a read succeeds. An empty array means looked, and found none. */
  const [journeys, setJourneys] = useState<readonly Journey[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void source
        .entries('labs')
        .then((entries) => {
          if (!cancelled) setJourneys(markerJourneys(entries));
        })
        .catch(() => {
          /* A store that will not read draws nothing. A blank chart is a claim about a person's
             panels, and a failed read must never make one. */
        });
      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  if (journeys === null || journeys.length === 0) return null;

  return (
    <View style={styles.block}>
      <Text style={[styles.heading, { color: colors.textSubtle }]}>OVER TIME</Text>
      <Text style={[styles.note, { color: colors.textMuted }]}>
        Markers you have measured at least {PANELS_FOR_A_LINE} times. Oldest on the left.
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {journeys.map((journey, index) => {
          const values = journey.points.map((point) => point.value);
          const line = sparkline(values, WIDTH, HEIGHT);
          const move = journeyMove(journey);
          const last = journey.points[journey.points.length - 1];

          return (
            <Fragment key={journey.key}>
              {index > 0 && <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />}
              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {NAME[journey.key] ?? journey.key}
                  </Text>
                  {/* "about the same THAN the first" — the comparative and the equative do not
                      take the same preposition, and one conditional producing both was how it
                      happened. Each phrase now carries its own ending. */}
                  <Text style={[styles.count, { color: colors.textSubtle }]}>
                    {journey.points.length} readings · {moveSentence(move)}
                  </Text>
                </View>

                {/* One colour, whatever the value does. A line that turns red below a threshold is
                    a verdict, and the report already carries its own ranges. */}
                <Svg height={HEIGHT} style={styles.chart} width={WIDTH}>
                  {line.baselineY !== null && (
                    <Line
                      stroke={colors.hairline}
                      strokeDasharray="2 3"
                      strokeWidth={1}
                      x1={0}
                      x2={WIDTH}
                      y1={line.baselineY}
                      y2={line.baselineY}
                    />
                  )}
                  <Path
                    d={line.d}
                    fill="none"
                    stroke={colors.accent}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                  />
                </Svg>

                {/* Absent rather than a stray unit on its own. `formatMeasured` returns null for
                    a number that is not one, which is the absence law deciding this for us. */}
                {last !== undefined && (
                  <Text style={[styles.latest, { color: colors.text }]}>
                    {formatMeasured(last.value, journey.unit)}
                  </Text>
                )}
              </View>
            </Fragment>
          );
        })}
      </View>

      <Text style={[styles.note, { color: colors.textSubtle }]}>
        The dotted line is your own average across these readings — not a target, and not a range
        anybody recommends.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: spacing.md, marginTop: spacing.lg },
  card: { borderRadius: radius.md, marginTop: spacing.sm, paddingHorizontal: spacing.md },
  chart: { flex: 0 },
  count: { fontFamily: fontFamily.body, fontSize: typography.micro, marginTop: 1 },
  heading: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
  },
  latest: { fontFamily: fontFamily.medium, fontSize: typography.caption, minWidth: 64, textAlign: 'right' },
  left: { flexShrink: 1 },
  name: { fontFamily: fontFamily.body, fontSize: typography.bodySmall },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rule: { height: StyleSheet.hairlineWidth },
});

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Body from 'react-native-body-highlighter';

import { isMuscle, type Intensity, type MuscleSlug } from '@/application/twin/muscleLoad';
import { fontFamily, lineHeights, spacing, tracking, typography, useTheme } from '@/ui/theme';

/**
 * The Digital Twin as a body, with the muscles you have worked lately.
 *
 * **The anatomy is not ours and was never going to be.** Six passes of hand-drawn SVG produced
 * something the owner rightly rejected — typing bezier coordinates does not make a human figure.
 * `react-native-body-highlighter` (MIT) draws it properly: male and female, front and back, one
 * named region per muscle group, built for React Native rather than ported to it. Its licence sits
 * beside the dependency and its author is credited in `README.md`.
 *
 * What stays ours is everything the drawing does not decide: what the colour MEANS, the scale it
 * runs on, the sentence under it, and which muscles a logged session reaches
 * (`application/twin/muscleLoad.ts`).
 *
 * **Colour is load, not advice.** The owner settled that on 2026-08-19: a colour cannot carry a
 * caveat, so it reports what happened and the coach says what to do about it in words. No red — the
 * scale tops out in amber, because red is a warning and nothing here is entitled to make one.
 */

/** What the figure is showing. Front and back are the same body from two sides, not two figures. */
type Side = 'back' | 'front';

export function BodyFigure({
  loads,
  onMusclePress,
  scale = 1,
  showCaption = true,
  unplaced = 0,
}: {
  loads: Readonly<Partial<Record<MuscleSlug, Intensity>>>;
  /** Tapping a muscle marks it worked. Absent on Home, where the figure is a picture, not a control. */
  onMusclePress?: (slug: MuscleSlug) => void;
  scale?: number;
  showCaption?: boolean;
  /** Sessions in the window whose kind nobody has mapped. Said out loud rather than absorbed. */
  unplaced?: number;
}) {
  const { colors } = useTheme();
  const [side, setSide] = useState<Side>('front');

  const worked = Object.entries(loads) as [MuscleSlug, Intensity][];

  return (
    <View style={styles.wrap}>
      <Body
        /* One hue in three steps. The scale is relative to the busiest muscle this week, which the
           caption below has to say — otherwise the darkest amber reads as an absolute claim. */
        colors={[colors.loadSoft, colors.loadMedium, colors.loadStrong]}
        data={worked.map(([slug, intensity]) => ({ intensity, slug }))}
        defaultFill={colors.bodyRest}
        border={colors.bodyOutline}
        gender="male"
        onBodyPartPress={
          onMusclePress === undefined
            ? undefined
            : (part) => {
                // The figure also draws head, hair, neck, hands, feet, ankles and knees. They are
                // parts of a body rather than muscles anybody trains, so tapping one records
                // nothing — `isMuscle` is the guard, and it is where the two vocabularies meet.
                if (isMuscle(part.slug)) onMusclePress(part.slug);
              }
        }
        scale={scale}
        side={side}
      />

      {showCaption && (
        <>
          <View style={styles.sides}>
            {(['front', 'back'] as const).map((option) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: side === option }}
                key={option}
                onPress={() => setSide(option)}
                style={({ pressed }) => [
                  styles.sideButton,
                  {
                    backgroundColor: side === option ? colors.accentSoft : 'transparent',
                    borderColor: side === option ? colors.accentBorder : colors.hairline,
                  },
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.sideText,
                    { color: side === option ? colors.accent : colors.textMuted },
                  ]}>
                  {option === 'front' ? 'Front' : 'Back'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* The legend says what the colour is, in the words the owner chose. "Worked most" is a
              reading; "needs rest" would be advice, and this is not the surface that gives it. */}
          <Text style={[styles.legend, { color: colors.textSubtle }]}>
            {worked.length === 0
              ? 'Nothing logged in the last seven days, so nothing is marked.'
              : 'Darker means worked more in the last seven days, compared with the rest of your week.'}
          </Text>

          {unplaced > 0 && (
            <Text style={[styles.legend, { color: colors.textSubtle }]}>
              {unplaced === 1
                ? '1 session is not shown — nothing here knows which muscles it reaches.'
                : `${unplaced} sessions are not shown — nothing here knows which muscles they reach.`}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  pressed: { opacity: 0.6 },
  sideButton: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  sideText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.caption,
    letterSpacing: tracking.wide,
  },
  sides: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  wrap: { alignItems: 'center' },
});

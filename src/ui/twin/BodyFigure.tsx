import { useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';

import {
  isMuscle,
  MUSCLE_SLUGS,
  type Intensity,
  type MuscleSlug,
} from '@/application/twin/muscleLoad';
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

/** How far you have to drag before it turns. Short enough to feel light, long enough not to misfire. */
const TURN_DISTANCE = 40;

/** Half a turn, in milliseconds. The other half runs after the side swaps. */
const HALF_TURN = 160;

/**
 * Every part the drawing has: the muscles, plus the head, hair, neck, hands, feet, ankles and knees
 * that make it a body rather than a diagram.
 *
 * **This list is here because `defaultFill` does not work.** The library ships each part with a
 * hard-coded `color: '#3f3f3f'` in its own asset files, and its `getColorToFill` prefers that colour
 * over `defaultFill` — so `defaultFill` only ever reaches a part that has no colour of its own,
 * which is none of them. That is why the figure kept rendering near-black charcoal on warm paper
 * however `bodyRest` was set, and why reading the dependency was the only way to find it.
 *
 * Naming every part and handing the resting ones an explicit `styles.fill` is what takes effect:
 * `styles.fill` sits at the TOP of that same priority list. Slugs the current side does not draw are
 * simply not matched, so one list serves front and back.
 */
const DRAWN_PARTS: readonly Slug[] = [
  ...MUSCLE_SLUGS,
  'ankles',
  'feet',
  'hair',
  'hands',
  'head',
  'knees',
  'neck',
];

export function BodyFigure({
  loads,
  onMusclePress,
  read = true,
  scale = 1,
  showCaption = true,
  unplaced = 0,
}: {
  loads: Readonly<Partial<Record<MuscleSlug, Intensity>>>;
  /** Tapping a muscle marks it worked. Absent on Home, where the figure is a picture, not a control. */
  onMusclePress?: (slug: MuscleSlug) => void;
  /**
   * Whether the store was actually read. **A grey figure means one of three things** — you logged
   * nothing, the query has not run yet, or it failed — and only the first of those is something the
   * caption may say out loud.
   */
  read?: boolean;
  scale?: number;
  showCaption?: boolean;
  /** Sessions in the window whose kind nobody has mapped. Said out loud rather than absorbed. */
  unplaced?: number;
}) {
  const { colors } = useTheme();
  const [side, setSide] = useState<Side>('front');

  /**
   * Turning the figure.
   *
   * The owner asked for a body he could turn, "movable to the left and right". True 3D needs a
   * rigged model and a renderer — checked on 2026-08-20, and the licensed anatomy atlases that
   * exist are research files that still need an artist's day to become an app asset.
   *
   * This is the interaction without the engine: dragging horizontally squeezes the figure to
   * nothing, swaps the side underneath, and opens it out again — the way a card turns over. It is
   * an illusion and it is honestly one; you cannot stop it at a three-quarter angle. What it does
   * give is the gesture, on the artwork we already have, with no model and no licence to carry.
   */
  /**
   * Turning the figure.
   *
   * The owner asked for a body he could turn, "movable to the left and right". True 3D needs a
   * rigged model and a renderer — checked on 2026-08-20, and the licensed anatomy atlases that
   * exist are research files that still need an artist's day to become an app asset.
   *
   * This is the interaction without the engine: dragging horizontally squeezes the figure to
   * nothing, swaps the side underneath, and opens it out again — the way a card turns over. It is
   * an illusion and it is honestly one; you cannot stop it at a three-quarter angle.
   *
   * **Built once, in a closure, with no refs at all.** The obvious shapes here — `useRef().current`
   * read during render, or a ref read inside a `useMemo` — are both what the React Compiler's
   * ref rule exists to catch, and it caught them twice. A plain local variable inside a lazy
   * `useState` initialiser gives the same create-once guarantee and the same mid-turn guard, with
   * nothing for the rule to object to. `setSide` is stable, so the closure never goes stale.
   */
  const [motion] = useState(() => {
    const turn = new Animated.Value(1);
    let busy = false;

    const flip = (swap: () => void) => {
      if (busy) return;
      busy = true;

      Animated.timing(turn, { duration: HALF_TURN, toValue: 0, useNativeDriver: true }).start(() => {
        // The swap happens at the exact midpoint, while there is no width to see through.
        swap();
        Animated.timing(turn, { duration: HALF_TURN, toValue: 1, useNativeDriver: true }).start(
          () => {
            busy = false;
          },
        );
      });
    };

    return {
      pan: PanResponder.create({
        // Claim the gesture only once it is clearly horizontal, so a vertical drag still scrolls
        // the screen. A figure that eats the scroll is worse than one that does not turn.
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderRelease: (_event, gesture) => {
          if (Math.abs(gesture.dx) >= TURN_DISTANCE) {
            flip(() => setSide((current) => (current === 'front' ? 'back' : 'front')));
          }
        },
      }),
      flip,
      turn,
    };
  });

  const worked = Object.entries(loads) as [MuscleSlug, Intensity][];

  /* One object shared by every resting part, rather than one allocated per part per render. */
  const restStyles = { fill: colors.bodyRest };
  const parts = DRAWN_PARTS.map((slug) => {
    const intensity = isMuscle(slug) ? loads[slug] : undefined;
    return intensity === undefined ? { slug, styles: restStyles } : { intensity, slug };
  });

  return (
    <View style={styles.wrap}>
      {/* `scaleX` rather than a rotation: a real rotateY needs perspective to read as a turn, and
          without it a flat figure just squashes and looks broken. Squeezing to nothing and opening
          out reads as turning at this size, and behaves identically on the web export. */}
      <Animated.View {...motion.pan.panHandlers} style={{ transform: [{ scaleX: motion.turn }] }}>
        <Body
          /* One hue in three steps. The scale is relative to the busiest muscle this week, which
             the caption below has to say — otherwise the darkest amber reads as an absolute claim. */
          colors={[colors.loadSoft, colors.loadMedium, colors.loadStrong]}
          data={parts}
          /* Kept as a backstop for anything `DRAWN_PARTS` misses in a future version of the
             library. It is not what colours the resting body — see `DRAWN_PARTS` for why. */
          defaultFill={colors.bodyRest}
          border={colors.bodyOutline}
          gender="male"
          onBodyPartPress={
            onMusclePress === undefined
              ? undefined
              : (part) => {
                  // The figure also draws head, hair, neck, hands, feet, ankles and knees. Those
                  // are parts of a body rather than muscles anybody trains, so tapping one records
                  // nothing — `isMuscle` is where the two vocabularies meet.
                  if (isMuscle(part.slug)) onMusclePress(part.slug);
                }
          }
          scale={scale}
          side={side}
        />
      </Animated.View>

      {showCaption && (
        <>
          <View style={styles.sides}>
            {(['front', 'back'] as const).map((option) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: side === option }}
                key={option}
                onPress={() => {
                  if (option !== side) {
                    motion.flip(() => setSide(option));
                  }
                }}
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
          {/**
            * Three states, and only one of them is a claim about the person.
            *
            * `!read` says nothing at all: the figure is grey because nothing has been looked up
            * yet, or the store would not open, and neither is a fact about anybody's training.
            *
            * `unplaced > 0` matters too. This used to print "Nothing logged in the last seven
            * days" directly above "1 session is not shown", because a session logged as "Something
            * else" maps to no muscles and leaves `worked` empty. Something WAS logged; the figure
            * just cannot place it, and the line below already says so.
            */}
          {read && (
            <Text style={[styles.legend, { color: colors.textSubtle }]}>
              {worked.length === 0 && unplaced === 0
                ? 'Nothing logged in the last seven days, so nothing is marked.'
                : worked.length === 0
                  ? 'Nothing here can be placed on the figure yet.'
                  : 'Darker means worked more in the last seven days, compared with the rest of your week.'}
            </Text>
          )}

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

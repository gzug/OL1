import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View, type TextStyle } from 'react-native';

/**
 * Text that arrives letter by letter.
 *
 * Written rather than installed, and the licence is why: the one package that advertises Expo
 * support and stable sizing (`typewriter4react-native`) ships NO licence file, which means all
 * rights reserved. The maintained MIT alternatives are a few dozen stars and last touched in 2023.
 * Against that, this is a timer and a `slice`.
 *
 * **The full sentence is drawn underneath at zero opacity.** That is the one real problem those
 * packages exist to solve: without it the box grows as the words arrive, the line re-wraps, and
 * everything below it jumps. The invisible copy reserves the final size on the first frame and the
 * typed copy is laid over it.
 *
 * **A screen reader is given the whole sentence, never a fragment.** Announcing a half-typed word
 * is worse than not animating at all, so the visible layer carries the complete text as its label
 * and the ghost is hidden from accessibility entirely.
 *
 * **Reduce motion is honoured, and nothing types before the answer is known** — starting and then
 * jumping to the end would be a worse flicker than the animation it was meant to spare.
 */
export function Typewriter({
  complete = false,
  msPerLetter = 45,
  onDone,
  style,
  text,
}: {
  /** Set by a tap anywhere on the screen. Nobody should have to wait out an animation. */
  complete?: boolean;
  msPerLetter?: number;
  onDone?: () => void;
  style?: TextStyle | readonly TextStyle[];
  text: string;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled) return;
        if (reduced) {
          setCount(text.length);
          return;
        }
        setStarted(true);
      })
      .catch(() => {
        // A platform that cannot answer gets the animation. It is the default everywhere the
        // question is supported, and a silent failure should not change what the screen does.
        if (!cancelled) setStarted(true);
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  /**
   * Derived, never stored. Writing this from an effect would cost a render pass before a tap took
   * effect, and `react-hooks/set-state-in-effect` refuses it for exactly that reason.
   */
  const shown = complete ? text.length : count;

  useEffect(() => {
    if (!started || complete) return undefined;

    const timer = setInterval(() => {
      setCount((current) => (current >= text.length ? current : current + 1));
    }, msPerLetter);

    return () => clearInterval(timer);
  }, [complete, msPerLetter, started, text]);

  useEffect(() => {
    if (shown >= text.length && !done.current) {
      done.current = true;
      onDone?.();
    }
  }, [onDone, shown, text]);

  return (
    <View>
      <Text importantForAccessibility="no-hide-descendants" style={[style, styles.ghost]}>
        {text}
      </Text>
      <Text accessibilityLabel={text} style={[style, StyleSheet.absoluteFill]}>
        {text.slice(0, shown)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: { opacity: 0 },
});

import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fontFamily, radius, spacing, typography, useTheme } from '@/ui/theme';

import { banner, frame } from './tokens';

/**
 * On web the mockup refuses to stretch. A phone layout expanded to a 1400px browser window looks
 * broken, and the owners would be reviewing a lie instead of the proportions they will ship.
 *
 * The banner sits INSIDE the frame on purpose: screenshots get pasted into chat stripped of every
 * surrounding caption, and this is the only marker that survives that trip.
 */
export function MockupFrame({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.page, { backgroundColor: colors.background }, isWeb && styles.pageWeb]}>
      <View
        style={[
          styles.frame,
          { backgroundColor: colors.background },
          isWeb ? [styles.frameWeb, { borderColor: colors.border }] : styles.frameNative,
        ]}>
        <View style={[styles.banner, { backgroundColor: banner.background }]}>
          <Text style={[styles.bannerText, { color: banner.ink }]}>
            Mockup · nothing here works · sample data, not real health data
          </Text>
        </View>
        {children}
      </View>
      {isWeb && (
        <Text style={[styles.caption, { color: colors.textSubtle }]}>
          Preview at {frame.width} × {frame.height} — Android reference size
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  bannerText: {
    fontFamily: fontFamily.strong,
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    paddingVertical: spacing.md,
  },
  frame: {
    overflow: 'hidden',
    width: '100%',
  },
  frameNative: {
    flex: 1,
  },
  /**
   * Fixed height, and deliberately NOT `flex: 1` — the two together collapse the frame, because
   * `flex: 1` also sets a zero flex-basis that the height then loses to.
   *
   * `flexShrink: 0` was the other half of that defence and it was wrong. A phone frame is 892 tall
   * and a laptop browser is often shorter, so the frame simply overflowed the window: the owner
   * could not see the chat bar at all, even full screen, because it had fallen off the bottom of a
   * page that does not scroll. `maxHeight` with shrink allowed lets a short window clamp it, and
   * `maxHeight` does not zero the flex basis the way `flex: 1` does — which is what the warning
   * above is actually about.
   */
  frameWeb: {
    borderRadius: radius.xl,
    borderWidth: 1,
    flexShrink: 1,
    height: frame.height,
    maxHeight: '100%',
    maxWidth: frame.width,
  },
  page: {
    flex: 1,
  },
  pageWeb: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    // Was `spacing.xl` top and bottom. On a short window that padding is 48px the frame does not
    // get, and the frame is the thing being reviewed.
    paddingVertical: spacing.sm,
  },
});

import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { color, frame } from './tokens';

/**
 * On web the mockup refuses to stretch. A phone layout expanded to a 1400px browser window looks
 * broken, and the owners would be reviewing a lie instead of the proportions they will ship.
 *
 * The banner sits INSIDE the frame on purpose: screenshots get pasted into chat stripped of every
 * surrounding caption, and this is the only marker that survives that trip.
 */
export function MockupFrame({ children }: { children: ReactNode }) {
  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.page, isWeb && styles.pageWeb]}>
      <View style={[styles.frame, isWeb ? styles.frameWeb : styles.frameNative]}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Mockup · nothing here works · sample data, not real health data
          </Text>
        </View>
        {children}
      </View>
      {isWeb && (
        <Text style={styles.caption}>
          Preview at {frame.width} × {frame.height} — Android reference size
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: color.mockup,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bannerText: {
    color: color.background,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  caption: {
    color: color.textQuiet,
    fontSize: 12,
    paddingVertical: 12,
  },
  frame: {
    backgroundColor: color.background,
    overflow: 'hidden',
    width: '100%',
  },
  frameNative: {
    flex: 1,
  },
  /**
   * Fixed height, and deliberately NOT `flex: 1` — the two together collapse the frame, because
   * `flex: 1` also sets a zero flex-basis that the height then loses to.
   */
  frameWeb: {
    borderColor: color.hairline,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
    height: frame.height,
    maxWidth: frame.width,
  },
  page: {
    backgroundColor: color.background,
    flex: 1,
  },
  pageWeb: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 24,
  },
});

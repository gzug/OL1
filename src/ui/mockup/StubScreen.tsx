import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily, lineHeights, radius, spacing, typography, useTheme } from '@/ui/theme';

/**
 * Every tap that would do something real lands here. A stub that says so is honest; a screen that
 * quietly does nothing trains people to believe the mockup is broken rather than unbuilt.
 */
export function StubScreen({ detail, title }: { detail?: string; title: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.screen}>
      <View style={[styles.box, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.textSubtle }]}>
          Mockup — this screen is not built yet.
        </Text>
        {detail !== undefined && (
          <Text style={[styles.detail, { color: colors.accent }]}>{detail}</Text>
        )}
      </View>
      <Link asChild href="/">
        <Pressable accessibilityRole="link" style={styles.back}>
          <Text style={[styles.backText, { color: colors.textSubtle }]}>← Back to Home</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    padding: spacing.md,
  },
  backText: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  box: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginHorizontal: spacing.xl,
    padding: 26,
  },
  detail: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: typography.heroInterpretation,
  },
});

import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color } from './tokens';

/**
 * Every tap that would do something real lands here. A stub that says so is honest; a screen that
 * quietly does nothing trains people to believe the mockup is broken rather than unbuilt.
 */
export function StubScreen({ detail, title }: { detail?: string; title: string }) {
  return (
    <View style={styles.screen}>
      <View style={styles.box}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>Mockup — this screen is not built yet.</Text>
        {detail !== undefined && <Text style={styles.detail}>{detail}</Text>}
      </View>
      <Link asChild href="/">
        <Pressable accessibilityRole="link" style={styles.back}>
          <Text style={styles.backText}>← Back to Home</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    padding: 14,
  },
  backText: {
    color: color.textQuiet,
    fontSize: 14,
  },
  body: {
    color: color.textQuiet,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  box: {
    alignItems: 'center',
    borderColor: color.hairline,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginHorizontal: 24,
    padding: 26,
  },
  detail: {
    color: color.accent,
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
  },
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: color.text,
    fontSize: 20,
    fontWeight: '600',
  },
});

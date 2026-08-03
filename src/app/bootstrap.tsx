import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getBootstrapCapability,
  initializeBootstrapStorage,
  runHealthReadSmoke,
  type BootstrapCapability,
} from '@/application/bootstrapCompatibility';
import { fontFamily, radius, spacing, typography, useTheme } from '@/ui/theme';

type CheckState = 'idle' | 'running' | 'complete';

const environment =
  (Constants.expoConfig?.extra?.environmentLabel as string | undefined) ?? 'UNKNOWN';

export default function BootstrapRoute() {
  const { colors } = useTheme();
  const [capability, setCapability] = useState<BootstrapCapability | null>(null);
  const [storageStatus, setStorageStatus] = useState('not checked');
  const [healthStatus, setHealthStatus] = useState('not checked');
  const [checkState, setCheckState] = useState<CheckState>('idle');

  useEffect(() => {
    void getBootstrapCapability().then(setCapability);
  }, []);

  async function runCompatibilityCheck() {
    setCheckState('running');
    const storage = await initializeBootstrapStorage();
    setStorageStatus(
      storage.status === 'ok' ? `ok · schema v${storage.schemaVersion}` : storage.status,
    );

    const health = await runHealthReadSmoke();
    setHealthStatus(
      health.status === 'ok' || health.status === 'empty'
        ? `${health.status} · ${health.recordCount} record(s)`
        : health.status,
    );
    setCheckState('complete');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.environmentBadge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.environmentText, { color: colors.onAccent }]}>{environment}</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>OL1</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Bootstrap compatibility surface
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          No product flow, navigation model, or legacy data is defined here.
        </Text>

        {Platform.OS === 'web' && (
          <View style={[styles.previewNotice, { borderColor: colors.accent }]}>
            <Text style={[styles.previewNoticeText, { color: colors.accent }]}>
              WEB PREVIEW · fixture data only · native capabilities are not proven here
            </Text>
          </View>
        )}

        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSubtle }]}>Platform</Text>
          <Text style={[styles.value, { color: colors.text }]}>{Platform.OS}</Text>
          <Text style={[styles.label, { color: colors.textSubtle }]}>Health capability</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {capability?.health ?? 'checking'}
          </Text>
          <Text style={[styles.label, { color: colors.textSubtle }]}>Storage</Text>
          <Text style={[styles.value, { color: colors.text }]}>{storageStatus}</Text>
          <Text style={[styles.label, { color: colors.textSubtle }]}>Health read smoke</Text>
          <Text style={[styles.value, { color: colors.text }]}>{healthStatus}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={checkState === 'running'}
          onPress={runCompatibilityCheck}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent },
            pressed && styles.buttonPressed,
            checkState === 'running' && styles.buttonDisabled,
          ]}>
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>
            {checkState === 'running' ? 'Checking…' : 'Run compatibility check'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    padding: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontFamily: fontFamily.strong,
    fontSize: 16,
  },
  content: {
    alignSelf: 'center',
    gap: spacing.md,
    /** Wider than `layout.maxWidth` on purpose: this is a diagnostic table, not a product screen. */
    maxWidth: 680,
    padding: spacing.xl,
    width: '100%',
  },
  environmentBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  environmentText: {
    fontFamily: fontFamily.strong,
    fontSize: typography.caption,
    letterSpacing: 1.2,
  },
  label: {
    fontFamily: fontFamily.strong,
    fontSize: typography.micro,
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  panel: {
    borderRadius: radius.lg,
    gap: 6,
    padding: 18,
  },
  previewNotice: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  previewNoticeText: {
    fontFamily: fontFamily.semi,
    fontSize: typography.caption,
  },
  safeArea: {
    flex: 1,
  },
  subtitle: {
    fontFamily: fontFamily.semi,
    fontSize: typography.heroInterpretation,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 42,
  },
  value: {
    fontFamily: fontFamily.body,
    fontSize: 16,
  },
});

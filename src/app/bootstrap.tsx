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

type CheckState = 'idle' | 'running' | 'complete';

const environment =
  (Constants.expoConfig?.extra?.environmentLabel as string | undefined) ?? 'UNKNOWN';

export default function BootstrapRoute() {
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.environmentBadge}>
          <Text style={styles.environmentText}>{environment}</Text>
        </View>
        <Text style={styles.title}>OL1</Text>
        <Text style={styles.subtitle}>Bootstrap compatibility surface</Text>
        <Text style={styles.body}>
          No product flow, navigation model, or legacy data is defined here.
        </Text>

        {Platform.OS === 'web' && (
          <View style={styles.previewNotice}>
            <Text style={styles.previewNoticeText}>
              WEB PREVIEW · fixture data only · native capabilities are not proven here
            </Text>
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.label}>Platform</Text>
          <Text style={styles.value}>{Platform.OS}</Text>
          <Text style={styles.label}>Health capability</Text>
          <Text style={styles.value}>{capability?.health ?? 'checking'}</Text>
          <Text style={styles.label}>Storage</Text>
          <Text style={styles.value}>{storageStatus}</Text>
          <Text style={styles.label}>Health read smoke</Text>
          <Text style={styles.value}>{healthStatus}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={checkState === 'running'}
          onPress={runCompatibilityCheck}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            checkState === 'running' && styles.buttonDisabled,
          ]}>
          <Text style={styles.buttonText}>
            {checkState === 'running' ? 'Checking…' : 'Run compatibility check'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0D12',
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 24,
    gap: 16,
  },
  environmentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E7FF57',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  environmentText: {
    color: '#0A0D12',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
  },
  subtitle: {
    color: '#D6DAE1',
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    color: '#AAB2BF',
    fontSize: 16,
    lineHeight: 24,
  },
  previewNotice: {
    borderColor: '#E7FF57',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  previewNoticeText: {
    color: '#E7FF57',
    fontSize: 13,
    fontWeight: '700',
  },
  panel: {
    backgroundColor: '#151A22',
    borderRadius: 14,
    padding: 18,
    gap: 6,
  },
  label: {
    color: '#7F8998',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  value: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#E7FF57',
    borderRadius: 12,
    padding: 16,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#0A0D12',
    fontSize: 16,
    fontWeight: '800',
  },
});

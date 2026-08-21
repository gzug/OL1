import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { hideWarning, withDescendants } from '@/application/hubs/visibility';
import type { HubDefinition } from '@/ui/hubs/catalog';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * Put this hub away.
 *
 * **Hidden, never deleted — the owner chose that on 2026-08-21 when asked whether hubs should be
 * removable.** A hub holds meals, sessions and blood panels, and a database has no undo button.
 *
 * Two things this screen must do, and both are the difference between a safe feature and a
 * frightening one:
 *
 * 1. **Say what stays.** "Hide" is a word people read as "get rid of". If the button does not
 *    promise the data survives, the choice of hideable over deletable has been thrown away at the
 *    last step.
 * 2. **Say what else goes.** Hiding Exercise takes Running and Gym with it, because they are only
 *    reachable through it. That is the part nobody expects, so it is named before the tap, not
 *    discovered after.
 *
 * It asks twice. Not as ceremony — the first tap is where a person reads the consequence, and a
 * one-tap version means the sentence explaining it appears only after it no longer matters.
 */
export function HideHub({
  hub,
  entryCount,
  hubs,
  source = defaultHubs,
}: {
  entryCount: number;
  hub: HubDefinition;
  hubs: readonly HubDefinition[];
  source?: typeof defaultHubs;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [state, setState] = useState<'failed' | 'idle' | 'hiding'>('idle');

  async function hide() {
    setState('hiding');
    try {
      // The parent and everything only reachable through it, in one go.
      for (const id of withDescendants(hubs, hub.id)) await source.hide(id);
      router.replace('/');
    } catch {
      setState('failed');
    }
  }

  if (!asking) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setAsking(true)}
        style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}>
        <Text style={[styles.quietText, { color: colors.textSubtle }]}>Hide this hub</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={[styles.warning, { color: colors.textMuted }]}>
        {hideWarning(hubs, hub.id, entryCount)}
      </Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={state === 'hiding'}
          onPress={() => void hide()}
          style={({ pressed }) => [
            styles.confirm,
            { borderColor: colors.hairline },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.confirmText, { color: colors.text }]}>
            {state === 'hiding' ? 'Hiding…' : `Hide ${hub.label}`}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAsking(false)}
          style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}>
          <Text style={[styles.quietText, { color: colors.textMuted }]}>Keep it</Text>
        </Pressable>
      </View>

      {state === 'failed' && (
        <Text style={[styles.warning, { color: colors.warning }]}>
          That could not be saved, so nothing changed. Try again.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.sm },
  block: { marginTop: spacing.xl },
  confirm: {
    borderRadius: 99,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  confirmText: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  pressed: { opacity: 0.6 },
  quiet: { paddingVertical: spacing.sm },
  quietText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  warning: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
  },
});

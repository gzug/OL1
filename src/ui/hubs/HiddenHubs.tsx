import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { hiddenHubs } from '@/application/hubs/visibility';
import { useHubs } from '@/ui/hubs/useHubs';
import { fontFamily, lineHeights, spacing, tracking, typography, useTheme } from '@/ui/theme';

/**
 * The hubs you have put away, and the way back.
 *
 * **It lives on the create-a-hub screen on purpose.** "Add one" and "bring one back" are the same
 * question asked twice, and a person who has hidden Sleep and wants it again will look for it where
 * hubs come from. Building a settings screen to hold one list would have been a worse answer to
 * "where did it go".
 *
 * Renders nothing when nothing is hidden — an empty "nothing here" box on a screen about creating
 * things is noise.
 */
export function HiddenHubs({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const { hidden, hubs } = useHubs(source);
  const [restoring, setRestoring] = useState<string | null>(null);

  const away = hiddenHubs(hubs, hidden);
  if (away.length === 0) return null;

  /**
   * Only the top level. Running was hidden because Exercise was, and offering to restore it on its
   * own would put a hub back where nothing leads to it — the same trap `withDescendants` exists to
   * avoid, from the other direction.
   */
  const restorable = away.filter((hub) => hub.parentId === undefined || !hidden.includes(hub.parentId));

  async function restore(id: string) {
    setRestoring(id);
    try {
      // The hub and everything that went away with it.
      const back = away.filter((hub) => hub.id === id || hub.parentId === id).map((hub) => hub.id);
      for (const hubId of back) await source.unhide(hubId);
    } finally {
      setRestoring(null);
    }
  }

  return (
    <View style={styles.block}>
      <Text style={[styles.heading, { color: colors.textSubtle }]}>PUT AWAY</Text>
      {restorable.map((hub, index) => (
        <Fragment key={hub.id}>
          {index > 0 && <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />}
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>{hub.label}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={restoring === hub.id}
              onPress={() => void restore(hub.id)}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <Text style={[styles.actionText, { color: colors.accent }]}>
                {restoring === hub.id ? 'Bringing back…' : 'Bring back'}
              </Text>
            </Pressable>
          </View>
        </Fragment>
      ))}
      <Text style={[styles.note, { color: colors.textSubtle }]}>
        Everything logged in these is still here, exactly as it was.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  action: { paddingVertical: spacing.xs },
  actionText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  block: { marginTop: spacing.xl },
  heading: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xs,
  },
  label: { flexShrink: 1, fontFamily: fontFamily.body, fontSize: typography.bodySmall },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rule: { height: StyleSheet.hairlineWidth },
});

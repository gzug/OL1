import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { panelCount, panelRecency, recencySentence } from '@/application/labs/panelRecency';
import type { HubEntry } from '@/core/hubs';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * How old this panel is, and whether there is more than one of them.
 *
 * The two facts a person needs before reading anything else on a Labs screen. A number from a panel
 * drawn fourteen months ago is not wrong, but it is old, and a screen that shows the number without
 * the date invites it to be read as current.
 *
 * Every sentence here is about a DATE. None of them says to book a test — see
 * `application/labs/panelRecency.ts` for why that line is drawn where it is.
 */

export function PanelAge({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<readonly HubEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void source
        .entries('labs')
        .then((found) => {
          if (!cancelled) setEntries(found);
        })
        .catch(() => {
          // Unreadable store says nothing about panels rather than "no panel yet", which would be
          // a claim about the person's data made on the strength of a database error.
        });
      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  const recency = panelRecency(entries, new Date().toISOString());
  if (recency.status === 'none') return null;

  const count = panelCount(entries);
  const tone =
    recency.status === 'stale' ? colors.textMuted : recency.status === 'ageing' ? colors.textMuted : colors.text;

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.textSubtle }]}>YOUR LAST PANEL</Text>
      <Text style={[styles.sentence, { color: tone }]}>{recencySentence(recency)}</Text>

      {/* One panel is a point, not a line. The Twin says the same thing in words; this says it with
          the count behind it. */}
      <Text style={[styles.note, { color: colors.textSubtle }]}>
        {count === 1
          ? 'One panel is a reading. A second is what turns it into a direction.'
          : `${count} panels, so this hub can show which way a marker moved.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingTop: spacing.lg },
  label: { fontFamily: fontFamily.medium, fontSize: typography.micro },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
  },
  sentence: {
    fontFamily: fontFamily.body,
    fontSize: typography.body,
    lineHeight: lineHeights.body,
    marginTop: spacing.xs,
  },
});

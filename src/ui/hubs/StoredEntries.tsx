import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { HubEntry } from '@/core/hubs';
import { day, isHeld, kindWords, sourceWords } from '@/ui/hubs/entryWords';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * What this hub actually holds — above the fixtures, and never mixed into them.
 *
 * The separation is the point rather than a layout choice. Every number below this block is
 * invented for layout review; every number in it is something the person entered. Interleaving them
 * would make a screen where the two are indistinguishable, which is the one thing the fixtures rule
 * is firmest about. So they are two blocks with two headings, and this one says where its numbers
 * came from.
 *
 * It renders nothing at all when the hub is empty. An empty state here would sit above a cockpit
 * full of plausible fixtures, which reads as "your data is missing" rather than "you have not
 * logged anything" — the exact confusion `FailedReadState` exists to prevent in Legacy.
 */

/** How many rows the list shows. A cap on the LIST, never on the count above it. */
const SHOWN = 5;


function countLine(entries: readonly HubEntry[]): string {
  const byKind = new Map<string, number>();
  // A goal somebody turned off is written down and is not something they have. See `isHeld`.
  for (const entry of entries.filter(isHeld)) {
    byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
  }

  return [...byKind.entries()]
    .map(([kind, count]) => `${count} ${kindWords(kind, count)}`)
    .join(' · ');
}

export function StoredEntries({ hubId, source = defaultHubs }: { hubId: string; source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<readonly HubEntry[]>([]);

  // On focus: logging a meal leaves this screen and comes back to it.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries(hubId)
        .then((found) => {
          if (!cancelled) setEntries(found);
        })
        .catch(() => {
          // A store that cannot be read shows nothing of its own. The fixtures below still render,
          // and they are clearly labelled as fixtures, so nothing here can be mistaken for data.
        });

      return () => {
        cancelled = true;
      };
    }, [hubId, source]),
  );

  if (entries.length === 0) return null;

  /**
   * Count everything, show the newest few.
   *
   * This used to fetch five and count what came back, so a hub with six entries said "5 meals" —
   * a wrong number, produced by a display limit leaking into a count. The limit belongs to the
   * list, never to the arithmetic.
   */
  const shown = entries.slice(0, SHOWN);

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.textSubtle }]}>WHAT YOU HAVE LOGGED</Text>
      <Text style={[styles.count, { color: colors.text }]}>{countLine(entries)}</Text>

      {shown.map((entry) => (
        <View key={entry.id} style={styles.row}>
          <Text style={[styles.when, { color: colors.textMuted }]}>{day(entry.recordedAt)}</Text>
          <Text style={[styles.how, { color: colors.textSubtle }]}>
            {sourceWords(entry.source)}
          </Text>
        </View>
      ))}

      {/**
        * This used to end "everything below this is sample data", and it stopped being true. Four
        * blocks of real content now sit between here and the fixtures — the logged week, the panel's
        * age, kidney function, the markers themselves — so the sentence was pointing at the wrong
        * boundary and calling real results invented.
        *
        * The marker moved to `HubScreen`, immediately above the fixtures, where the boundary
        * actually is. It stays correct as more real blocks arrive; this one could not.
        */}
      <Text style={[styles.note, { color: colors.textSubtle }]}>
        {entries.length > shown.length ? `Yours. Showing the newest ${shown.length}.` : 'Yours.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingBottom: spacing.md,
  },
  count: {
    fontFamily: fontFamily.medium,
    fontSize: typography.body,
    marginTop: 2,
  },
  how: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    marginTop: spacing.lg,
  },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  when: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
  },
});

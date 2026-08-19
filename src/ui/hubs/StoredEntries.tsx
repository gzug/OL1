import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { HubEntry } from '@/core/hubs';
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

/** How a kind of entry is written down. An unknown kind still renders, by its own name. */
const KINDS: Readonly<Record<string, { one: string; many: string }>> = {
  meal: { many: 'meals', one: 'meal' },
  panel: { many: 'panels', one: 'panel' },
  session: { many: 'sessions', one: 'session' },
  weight: { many: 'weigh-ins', one: 'weigh-in' },
};

/** How it got here, in the words a person would use. Shown, never guessed at. */
const SOURCES: Readonly<Record<string, string>> = {
  camera: 'photographed',
  chat: 'from a conversation',
  described: 'described',
  file: 'from a file',
  library: 'from a photo',
  manual: 'entered by hand',
  photo: 'photographed',
};

function countLine(entries: readonly HubEntry[]): string {
  const byKind = new Map<string, number>();
  for (const entry of entries) byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);

  return [...byKind.entries()]
    .map(([kind, count]) => {
      const words = KINDS[kind] ?? { many: `${kind} entries`, one: `${kind} entry` };
      return `${count} ${count === 1 ? words.one : words.many}`;
    })
    .join(' · ');
}

/** The date, as a person writes it. No time — an entry's hour is not the reading. */
function day(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'undated';
  return `${date.getUTCDate()} ${
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
      date.getUTCMonth()
    ]
  }`;
}

export function StoredEntries({ hubId, source = defaultHubs }: { hubId: string; source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<readonly HubEntry[]>([]);

  // On focus: logging a meal leaves this screen and comes back to it.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries(hubId, 5)
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

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.textSubtle }]}>WHAT YOU HAVE LOGGED</Text>
      <Text style={[styles.count, { color: colors.text }]}>{countLine(entries)}</Text>

      {entries.map((entry) => (
        <View key={entry.id} style={styles.row}>
          <Text style={[styles.when, { color: colors.textMuted }]}>{day(entry.recordedAt)}</Text>
          <Text style={[styles.how, { color: colors.textSubtle }]}>
            {SOURCES[entry.source] ?? entry.source}
          </Text>
        </View>
      ))}

      <Text style={[styles.note, { color: colors.textSubtle }]}>
        Yours. Everything below this is sample data.
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

import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { HubEntry } from '@/core/hubs';
import { Period, SectionLabel } from '@/ui/hubs/Period';
import { medicalPeriods, recordNotes } from '@/ui/medical/cockpit';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * The Health record, from what somebody typed.
 *
 * Loads and renders; what the rows SAY is decided in `cockpit.ts` and asserted in bare Node.
 *
 * **The notes block is not drawn through `Period`, and that is the point of it.** A row is a label,
 * a value and a date sitting on one line — the right shape for "Cetirizine · Ongoing · 10mg" and
 * the wrong one for a sentence somebody wrote about their own body. Squeezed into a row, the text
 * becomes the label and truncates. So it renders as prose, with its date under it.
 */
export function RecordCockpit({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<readonly HubEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries('medical')
        .then((found) => {
          if (!cancelled) setEntries(found);
        })
        .catch(() => {
          // Nothing rather than a record this cannot stand behind.
        });

      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  const periods = medicalPeriods(entries);
  const notes = recordNotes(entries);
  /* Notes alone are a record. This used to read `periods.length === 0`, so a hub holding nothing
     but what somebody typed in the first run rendered no cockpit at all. */
  if (periods.length === 0 && notes.length === 0) return null;

  return (
    <View>
      {periods.map((period) => (
        <Fragment key={period.label}>
          <Period colors={colors} period={period} />
        </Fragment>
      ))}

      {notes.length > 0 && (
        <>
          {/* Not "in your own words". The first run writes two kinds of note here — what a person
              typed, and the line it adds for a result it cannot read — and nothing tells them
              apart. Claiming authorship would put ours in their mouth. */}
          <SectionLabel colors={colors} label="Notes" />
          {notes.map((note) => (
            <View key={note.text} style={styles.note}>
              <Text style={[styles.noteText, { color: colors.text }]}>{note.text}</Text>
              <Text style={[styles.noteWhen, { color: colors.textSubtle }]}>{note.day}</Text>
            </View>
          ))}
        </>
      )}

      {/* Said here as well as in the flow, because this is the screen somebody comes back to and
          the flow is the screen they saw once. `docs/decisions/0019`. */}
      <Text style={[styles.caption, { color: colors.textSubtle }]}>
        Yours, as you wrote it. Nothing here is checked against anything — no interaction is looked
        for between two medications, and no dose is judged.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  note: { paddingVertical: spacing.sm },
  /** Body size and a reading line-height: this is a sentence, not a data row. */
  noteText: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.body,
  },
  noteWhen: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: 2,
  },
});

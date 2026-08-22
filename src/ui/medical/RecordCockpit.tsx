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
            <View key={`${note.day}-${note.text}`} style={styles.note}>
              <Text style={[styles.noteText, { color: colors.text }]}>{note.text}</Text>
              <Text style={[styles.noteWhen, { color: colors.textSubtle }]}>{note.day}</Text>
            </View>
          ))}
        </>
      )}

      {/**
        * **The authorship claim is conditional and the refusal is not.**
        *
        * This read "Yours, as you wrote it" over everything, which was true while everything above
        * it was a condition or a medication. The notes block broke it: the first run writes one of
        * those lines itself, for a result it cannot read, and the caption was telling somebody they
        * had written our sentence. Found on the deployed screen, a merge after the notes landed.
        *
        * So the claim now names what it is true of. The refusal below it is said unconditionally —
        * `docs/decisions/0019` asks for it here as well as in the flow, because the flow is the
        * screen somebody sees once and this is the one they come back to.
        */}
      {periods.length > 0 && (
        <Text style={[styles.caption, { color: colors.textSubtle }]}>
          Your conditions and medications are kept exactly as you wrote them.
        </Text>
      )}
      <Text style={[styles.caption, { color: colors.textSubtle }]}>
        Nothing here is checked against anything — no interaction is looked for between two
        medications, and no dose is judged.
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

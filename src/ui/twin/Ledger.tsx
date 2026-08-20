import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { ledgerFooter, ledgerLines, type LedgerLine } from '@/application/hubs/ledger';
import type { HubEntry } from '@/core/hubs';
import { day, kindWords, sourceWords } from '@/ui/hubs/entryWords';
import { useHubs } from '@/ui/hubs/useHubs';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';

/**
 * Everything you have told this app, wherever you told it.
 *
 * A hub already shows its own entries; this answers the other question — not "what have I logged
 * about sleep" but "what have I recorded at all". The Twin is the only screen that is about the
 * whole person, which is why it lives here.
 *
 * It replaces a four-row fixture whose footer read "Showing 4 of 148" with 148 invented. A footer
 * that names a total has to be able to stand behind it.
 */

/** Enough to be a record, few enough to stay a summary. `ledgerFooter` names what is beyond it. */
const SHOWN = 8;

export function Ledger({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const hubs = useHubs();
  const [state, setState] = useState<{ lines: readonly LedgerLine[]; total: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        /**
         * Every hub, including ones the user made. Reading them one at a time would serialise a
         * dozen round trips for a list that is below the fold.
         */
        const perHub = await Promise.all(
          hubs.map(async (hub) => {
            const entries = await source.entries(hub.id);
            return entries.map((entry: HubEntry) => ({ ...entry, hubLabel: hub.label }));
          }),
        );
        if (cancelled) return;

        const all = perHub.flat();
        setState({ lines: ledgerLines(all, SHOWN), total: all.length });
      })().catch(() => {
        // A store that cannot be read shows no ledger rather than an empty one. "You have logged
        // nothing" is a claim about a person's data and must never be made by a database error.
      });

      return () => {
        cancelled = true;
      };
    }, [hubs, source]),
  );

  if (state === null || state.lines.length === 0) return null;

  const footer = ledgerFooter(state.total, state.lines.length);

  return (
    <View style={styles.block}>
      {state.lines.map((line, index) => (
        <Fragment key={line.id}>
          {index > 0 && <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />}
          <View style={styles.row}>
            <Text style={[styles.date, { color: colors.textSubtle }]}>{day(line.at)}</Text>
            <View style={styles.what}>
              <Text style={[styles.entry, { color: colors.text }]}>
                {capitalise(kindWords(line.kind, 1))} · {line.hubLabel}
              </Text>
              <Text style={[styles.how, { color: colors.textSubtle }]}>
                {sourceWords(line.source)}
              </Text>
            </View>
          </View>
        </Fragment>
      ))}
      {footer !== null && (
        <Text style={[styles.footer, { color: colors.textSubtle }]}>{footer}</Text>
      )}
    </View>
  );
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.sm },
  date: { fontFamily: fontFamily.body, fontSize: typography.caption, minWidth: 58 },
  entry: { fontFamily: fontFamily.body, fontSize: typography.bodySmall },
  footer: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: spacing.sm,
  },
  how: { fontFamily: fontFamily.body, fontSize: typography.micro, lineHeight: lineHeights.caption },
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  rule: { height: StyleSheet.hairlineWidth },
  what: { flexShrink: 1 },
});

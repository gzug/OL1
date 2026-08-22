import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bucketOpacity } from '@/application/exercise/heatmap';
import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { HubEntry } from '@/core/hubs';
import { useHubs } from '@/ui/hubs/useHubs';
import { fontFamily, lineHeights, radius, spacing, tracking, typography, useTheme } from '@/ui/theme';

import {
  SILENCE_WORDS,
  domainSummaries,
  type DomainSummary,
  type EntriesByHub,
} from './summaries';

/**
 * What every part of you is contributing to the twin.
 *
 * **This is the spec's own claim, finally on screen.** *One twin, fed by every domain, is the claim
 * the orbit exists to make* — settled 2026-08-03. Home draws each hub connected to the centre, and
 * until now opening the centre proved nothing: every domain computed something and showed it only on
 * its own hub screen.
 *
 * **A card is a reading, not a link.** The distinction is the whole risk of this design: five rows
 * naming five hubs is a table of contents, and the twin is not a menu. So each card leads with a
 * value — a weight, a count, a date the blood was drawn — and the hub is where tapping it goes,
 * never what it says.
 *
 * **Two across, on the owner's instruction of 2026-08-22.** As a single column they were five wide
 * bands with a short line in each and a great deal of paper between them; he read that as not
 * looking good and he was right. Paired, the whole set is visible without scrolling, which is what
 * makes it a summary rather than a list — you can see everything the twin knows in one look.
 *
 * **A domain with nothing to say still gets a card**, and says why. Two of the five cannot compute
 * anything at all, and hiding them would make the twin look complete. Naming them is the only thing
 * on this screen that shows a person what it is still missing.
 */

/** Nothing at all until the store has answered. `null` is not "you have logged nothing". */
type Loaded = { readonly entries: EntriesByHub; readonly hidden: readonly string[] } | null;

export function DomainCards({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const { hubs } = useHubs(source);
  const [loaded, setLoaded] = useState<Loaded>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        const perHub = await Promise.all(
          hubs.map(async (hub) => [hub.id, await source.entries(hub.id)] as const),
        );
        const hidden = await source.hidden();
        if (cancelled) return;

        const entries: Record<string, readonly HubEntry[]> = {};
        for (const [id, rows] of perHub) entries[id] = rows;
        setLoaded({ entries, hidden });
      })().catch(() => {
        /* A store that will not open says nothing about a person's domains. It used to be tempting
           to render the cards empty, which reads as "you have logged nothing" — a claim made by a
           database error. `docs/decisions/0013`, shape 1. */
      });

      return () => {
        cancelled = true;
      };
    }, [hubs, source]),
  );

  if (loaded === null) return null;

  const summaries = domainSummaries(loaded.entries, loaded.hidden, new Date().toISOString());
  if (summaries.length === 0) return null;

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.textSubtle }]}>WHAT EVERY PART OF YOU SAYS</Text>
      <View style={styles.grid}>
        {summaries.map((summary) => (
          <Card key={summary.hubId} summary={summary} />
        ))}
      </View>
    </View>
  );
}

function Card({ summary }: { summary: DomainSummary }) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/hub/${summary.hubId}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.domain, { color: colors.textMuted }]}>{summary.label}</Text>

      {summary.said === 'nothing' ? (
        <Text style={[styles.silent, { color: colors.textSubtle }]}>
          {SILENCE_WORDS[summary.why]}
        </Text>
      ) : (
        <>
          <Text style={[styles.headline, { color: colors.text }]}>{summary.headline}</Text>
          {summary.strip !== null && <Strip summary={summary} />}
          {summary.detail !== null && (
            <Text style={[styles.detail, { color: colors.textSubtle }]}>{summary.detail}</Text>
          )}
        </>
      )}
    </Pressable>
  );
}

/**
 * Twelve weeks of training, one column per week.
 *
 * A column rather than the hub's full seven-by-twelve grid: at card size a grid is a smudge, and the
 * question this screen asks is coarser — were there weeks with nothing in them. The busiest day in
 * each week sets its column, so a week with one hard session reads as a week with something in it.
 *
 * `bucketOpacity` is the hub's own scale, so a quiet week is the same quiet here as there.
 */
function Strip({ summary }: { summary: Extract<DomainSummary, { said: 'something' }> }) {
  const { colors } = useTheme();
  const grid = summary.strip;
  if (grid === null) return null;

  const columns = grid.rows[0]?.length ?? 0;
  const weeks = Array.from({ length: columns }, (_, column) =>
    Math.max(...grid.rows.map((row) => row[column]?.bucket ?? 0)),
  );

  return (
    <View style={styles.strip}>
      {weeks.map((bucket, index) => (
        <View
          key={index}
          style={[
            styles.week,
            bucket === 0
              ? { backgroundColor: colors.borderSubtle }
              : { backgroundColor: colors.accent, opacity: bucketOpacity(bucket) },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg },
  /**
   * Half the row, less the gap. `flexBasis` rather than `width: '50%'` so the gap comes out of the
   * tile rather than pushing the second one onto its own line — which is what a percentage width
   * plus a gap does, and it looked like a bug rather than a layout.
   */
  card: {
    borderRadius: radius.md,
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 92,
    padding: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detail: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
  },
  domain: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  headline: { fontFamily: fontFamily.serif, fontSize: typography.body, marginTop: 3 },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  silent: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
    marginTop: 3,
  },
  strip: { flexDirection: 'row', gap: 1, marginTop: spacing.sm },
  week: { borderRadius: 1, flex: 1, height: 14 },
});

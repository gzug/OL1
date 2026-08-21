import { useRouter } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { hideWarning, withDescendants } from '@/application/hubs/visibility';
import { fontFamily, lineHeights, radius, spacing, typography, useTheme } from '@/ui/theme';

import { Note, Problem, Row, Rule, Section, styles } from './parts';
import { COPY, hubRows } from './settings';
import type { SettingsData } from './useSettings';

/**
 * What is on your ring, as one list.
 *
 * The owner chose one list over a training section and a hub section on 2026-08-21, and the change
 * that landed the same day made it the obvious shape anyway: the five sports stopped being hubs, so
 * the only thing nested here is Labs inside Health record.
 *
 * **Hidden, never deleted, and the screen has to say so.** *Hide* is a word people read as *get rid
 * of*, and the owner chose hideable over deletable precisely because a hub holds meals, sessions and
 * blood panels and a database has no undo button. `hideWarning` is the sentence `HideHub` already
 * shows on the hub itself — the same words, so the promise does not change depending on where it is
 * read.
 *
 * **It asks twice.** Not ceremony: the first tap is where the consequence is read, and a one-tap
 * version puts that sentence on screen only after it no longer matters.
 *
 * **A hub put away keeps its row.** A bin at the bottom would say it had left the app; a row in
 * place with a way back says what actually happened.
 */
export function HubsSection({
  data,
  onChanged,
  source = defaultHubs,
}: {
  data: SettingsData;
  onChanged: () => void;
  source?: typeof defaultHubs;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const rows = hubRows(data.hubs, data.hidden);
  const away = new Set(data.hidden);

  async function put(hubId: string, back: boolean) {
    setBusy(hubId);
    setFailed(false);
    try {
      // The hub and everything only reachable through it, in one go — the same set either way, so
      // putting one away and bringing it back are exact opposites rather than nearly.
      for (const id of withDescendants(data.hubs, hubId)) {
        if (back) await source.unhide(id);
        else await source.hide(id);
      }
      setAsking(null);
      onChanged();
    } catch {
      // Nothing moved. Saying so beats a row that quietly did not change.
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section hint={COPY.hubsHint} title={COPY.hubsTitle}>
      {rows.map((row, index) => {
        const parentAway = row.hub.parentId !== undefined && away.has(row.hub.parentId);
        /**
         * A child whose parent is away has no action of its own. It went away with its parent and it
         * comes back with it; offering to bring it back alone would put a hub somewhere nothing
         * leads to — the trap `withDescendants` exists to avoid, from the other direction.
         */
        const action = parentAway
          ? undefined
          : row.away
            ? COPY.bringBack
            : row.hub.id === asking
              ? undefined
              : COPY.putAway;

        return (
          <Fragment key={row.hub.id}>
            {index > 0 && <Rule />}
            <Row
              action={busy === row.hub.id ? '…' : action}
              indented={row.depth > 0}
              label={row.hub.label}
              muted={row.away}
              onPress={
                action === undefined || busy !== null
                  ? undefined
                  : row.away
                    ? () => void put(row.hub.id, true)
                    : () => setAsking(row.hub.id)
              }
            />

            {asking === row.hub.id && (
              <View style={local.asking}>
                <Text style={[local.warning, { color: colors.textMuted }]}>
                  {hideWarning(data.hubs, row.hub.id, (data.entries[row.hub.id] ?? []).length)}
                </Text>
                <View style={local.actions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy !== null}
                    onPress={() => void put(row.hub.id, false)}
                    style={({ pressed }) => [
                      local.confirm,
                      { borderColor: colors.hairline },
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[local.confirmText, { color: colors.text }]}>
                      {`${COPY.putAway} ${row.hub.label}`}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAsking(null)}
                    style={({ pressed }) => [local.keep, pressed && styles.pressed]}>
                    <Text style={[local.keepText, { color: colors.textMuted }]}>{COPY.keepIt}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Fragment>
        );
      })}

      <Rule />
      <Row action="›" label={COPY.addHub} onPress={() => router.push('/new-hub')} />

      {data.hidden.length > 0 && <Note text={COPY.putAwayNote} />}
      {failed && <Problem text={COPY.saveFailed} />}
    </Section>
  );
}

const local = StyleSheet.create({
  actions: { alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.sm },
  asking: { paddingBottom: spacing.sm },
  confirm: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  confirmText: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  keep: { paddingVertical: spacing.sm },
  keepText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  warning: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
  },
});

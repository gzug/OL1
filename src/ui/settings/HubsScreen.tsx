import { useRouter } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import { hideWarning, withDescendants } from '@/application/hubs/visibility';
import {
  fontFamily,
  lineHeights,
  radius,
  spacing,
  typography,
  useTheme,
} from '@/ui/theme';

import { Line, Note, Problem, Screen } from './chrome';
import { COPY } from './rows';
import { hubRows } from './settings';
import { useSettings } from './useSettings';

/**
 * Hubs — what is on your ring, and the way back for anything put away.
 *
 * **One list, in ring order, with anything nested under its parent** — the owner's choice on
 * 2026-08-21. Since the five sports stopped being hubs the only thing nested is Labs inside Health
 * record, which makes the list short enough to read at a glance.
 *
 * **Hidden, never deleted, and the screen has to say so.** *Hide* is a word people read as *get rid
 * of*, and hideable was chosen over deletable precisely because a hub holds meals, sessions and
 * blood panels and a database has no undo button. `hideWarning` is the same sentence `HideHub`
 * shows on the hub itself, so the promise does not change depending on where it is read.
 *
 * **It asks twice.** Not ceremony: the first tap is where the consequence is read, and a one-tap
 * version puts that sentence on screen only after it no longer matters.
 */
export function HubsScreen({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, reload } = useSettings(source);
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (data.status === 'unknown') return <Screen title={COPY.hubsTitle}>{null}</Screen>;
  if (data.status === 'failed') {
    return (
      <Screen title={COPY.hubsTitle}>
        <Note text={COPY.unread} />
      </Screen>
    );
  }

  /**
   * Held as a plain value, not read through `data` inside the handler below.
   *
   * `put` is a function declaration, so it is hoisted above the guards that narrowed `data` — and
   * TypeScript will not carry a narrowing across that. Capturing the value here is what makes the
   * narrowing survive into the closure, and it is one line rather than a cast.
   */
  const loaded = data.value;
  const rows = hubRows(loaded.hubs, loaded.hidden);
  const away = new Set(loaded.hidden);

  async function put(hubId: string, back: boolean) {
    setBusy(hubId);
    setFailed(false);
    try {
      // The hub and everything only reachable through it, in one go — the same set either way, so
      // putting one away and bringing it back are exact opposites rather than nearly.
      for (const id of withDescendants(loaded.hubs, hubId)) {
        if (back) await source.unhide(id);
        else await source.hide(id);
      }
      setAsking(null);
      reload();
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen title={COPY.hubsTitle}>
      <Note text={COPY.hubsHint} />

      <View style={local.list}>
        {rows.map((row) => {
          const parentAway = row.hub.parentId !== undefined && away.has(row.hub.parentId);
          /**
           * A child whose parent is away has no action of its own. It went away with its parent and
           * comes back with it; offering to bring it back alone would put a hub somewhere nothing
           * leads to — the trap `withDescendants` exists to avoid, from the other direction.
           */
          const action = parentAway
            ? undefined
            : busy === row.hub.id
              ? '…'
              : row.away
                ? 'Bring back'
                : row.hub.id === asking
                  ? undefined
                  : 'Put away';

          return (
            <Fragment key={row.hub.id}>
              <View style={row.depth > 0 ? local.child : undefined}>
                <Line
                  action={action}
                  label={row.hub.label}
                  onPress={
                    action === undefined || busy !== null
                      ? undefined
                      : row.away
                        ? () => void put(row.hub.id, true)
                        : () => setAsking(row.hub.id)
                  }
                />
              </View>

              {asking === row.hub.id && (
                <View style={local.asking}>
                  <Text style={[local.warning, { color: colors.textMuted }]}>
                    {hideWarning(loaded.hubs, row.hub.id, (loaded.entries[row.hub.id] ?? []).length)}
                  </Text>
                  <View style={local.actions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy !== null}
                      onPress={() => void put(row.hub.id, false)}
                      style={({ pressed }) => [
                        local.confirm,
                        { borderColor: colors.hairline },
                        pressed && local.pressed,
                      ]}>
                      <Text style={[local.confirmText, { color: colors.text }]}>
                        {`Put ${row.hub.label} away`}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setAsking(null)}
                      style={({ pressed }) => [local.keep, pressed && local.pressed]}>
                      <Text style={[local.keepText, { color: colors.textMuted }]}>Keep it</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </Fragment>
          );
        })}
      </View>

      <Line action="›" label="Add a hub of your own" onPress={() => router.push('/new-hub')} />

      {failed && <Problem text={COPY.saveFailed} />}
    </Screen>
  );
}

const local = StyleSheet.create({
  actions: { alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.sm },
  asking: { paddingBottom: spacing.sm, paddingHorizontal: spacing.sm },
  child: { paddingLeft: spacing.lg },
  confirm: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  confirmText: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  keep: { paddingVertical: spacing.sm },
  keepText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  list: { marginTop: spacing.md },
  pressed: { opacity: 0.6 },
  warning: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
  },
});

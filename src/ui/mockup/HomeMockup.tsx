import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  fontFamily,
  lineHeights,
  numerals,
  radius,
  spacing,
  typography,
  useTheme,
} from '@/ui/theme';

import { HUBS, type HubId, centre } from './fixtures';
import { CENTRE, DISC_RADIUS, STAGE } from './geometry';
import { Orbit } from './Orbit';

/**
 * Sized against the free circle inside the ring, not by eye: the widest row (the insight) sits near
 * the vertical middle where the most room is, and the narrow rows are the ones near the top and
 * bottom edges where the circle closes in. `tests/orbit-geometry.test.ts` pins the ring it depends on.
 */
const CENTRE_BOX = { height: 160, width: 240 };

function labelFor(id: HubId): string {
  return HUBS.find((hub) => hub.id === id)?.label ?? id;
}

/**
 * Home.
 *
 * The centre is state, the Open Table is an action, and they are kept apart — stacking a fourth
 * element under the three information rows turns the centre into a list, and a list has no
 * hierarchy. The action lives at the bottom, in the thumb zone, and it is the same element that
 * later confirms the selection.
 *
 * One element wins per visual channel: size goes to the drift number, contrast to the weekly
 * insight, colour to the daily focus. Nothing competes on the same axis, so the eye resolves the
 * order in one pass. That is the rule to review this screen against, and it survived the move off
 * the placeholder palette — only the hues changed.
 */
export function HomeMockup() {
  const { colors } = useTheme();
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<readonly HubId[]>([]);

  function handleHubPress(id: HubId) {
    if (!selecting) {
      // Tapping a hub opens that hub's own state. Chat is one step further in, never the front door.
      router.push(`/hub/${id}`);
      return;
    }
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function close() {
    setSelecting(false);
    setSelected([]);
  }

  return (
    <View style={styles.screen}>
      <Link asChild href="/twin">
        <Pressable accessibilityRole="link" style={styles.twinLink}>
          <Text style={[styles.twinLinkText, { color: colors.textMuted }]}>⌃  Digital Twin</Text>
        </Pressable>
      </Link>

      {selecting && (
        <Pressable
          accessibilityLabel="Close the open table"
          accessibilityRole="button"
          onPress={close}
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
        />
      )}

      <View style={styles.stageWrapper}>
        <View style={styles.stage}>
          <Orbit onHubPress={handleHubPress} selected={selected} selecting={selecting} />

          <View pointerEvents="none" style={styles.centreBox}>
            {selecting ? (
              <View
                style={[
                  styles.disc,
                  { backgroundColor: colors.surfaceSoft, borderColor: colors.border },
                ]}>
                <Text style={[styles.discText, { color: colors.textMuted }]}>Open{'\n'}Table</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.driftNumber, { color: colors.textMuted }]}>
                  {centre.driftNumber}
                </Text>
                <Text style={[styles.driftCaption, { color: colors.textSubtle }]}>
                  {centre.driftCaption}
                </Text>
                <Text numberOfLines={2} style={[styles.insight, { color: colors.text }]}>
                  {centre.insight}
                </Text>
                <View style={[styles.focusPill, { backgroundColor: colors.accentSoft }]}>
                  <Text numberOfLines={1} style={[styles.focusText, { color: colors.accent }]}>
                    {centre.focus}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {selecting && (
        <Text style={[styles.prompt, { color: colors.textMuted }]}>
          Who should be at the table?
        </Text>
      )}

      <View style={styles.bottom}>
        {selecting ? (
          <ConfirmBar
            onCancel={close}
            onConfirm={() => router.push(`/table?domains=${selected.join(',')}`)}
            selected={selected}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelecting(true)}
            style={({ pressed }) => [
              styles.openPill,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.openPillText, { color: colors.text }]}>Open Table</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ConfirmBar({
  onCancel,
  onConfirm,
  selected,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  selected: readonly HubId[];
}) {
  const { colors } = useTheme();
  const ready = selected.length > 0;
  /** Named, never counted: the number of chosen domains varies, so "asks two" breaks at one and six. */
  const names = selected.map(labelFor).join(', ');

  return (
    <View style={styles.confirmRow}>
      <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
        <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={!ready}
        onPress={onConfirm}
        style={({ pressed }) => [
          styles.confirm,
          ready
            ? { backgroundColor: colors.accent }
            : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          pressed && styles.pressed,
        ]}>
        <Text
          numberOfLines={1}
          style={[
            styles.confirmText,
            ready
              ? { color: colors.onAccent, fontFamily: fontFamily.semi }
              : { color: colors.textSubtle, fontFamily: fontFamily.body },
          ]}>
          {ready ? `Ask with ${names}` : 'Pick at least one'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    zIndex: 3,
  },
  cancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cancelText: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
  },
  centreBox: {
    alignItems: 'center',
    height: CENTRE_BOX.height,
    justifyContent: 'center',
    left: CENTRE - CENTRE_BOX.width / 2,
    position: 'absolute',
    top: CENTRE - CENTRE_BOX.height / 2,
    width: CENTRE_BOX.width,
  },
  confirm: {
    borderRadius: radius.xl,
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
  },
  confirmRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  confirmText: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  disc: {
    alignItems: 'center',
    borderRadius: DISC_RADIUS,
    borderWidth: 1,
    height: DISC_RADIUS * 2,
    justifyContent: 'center',
    width: DISC_RADIUS * 2,
  },
  discText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    lineHeight: 16,
    textAlign: 'center',
  },
  driftCaption: {
    fontFamily: fontFamily.body,
    fontSize: 9.5,
    letterSpacing: 0.7,
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  /**
   * Large so it anchors, and set in the lightest weight the brand has so it never reads as today's
   * verdict. Tabular figures: this number drifts slowly, and digits that jitter imply daily motion.
   */
  driftNumber: {
    ...numerals.tabular,
    fontFamily: fontFamily.display,
    fontSize: 40,
    lineHeight: 46,
  },
  focusPill: {
    borderRadius: 13,
    marginTop: spacing.md,
    maxWidth: 210,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  focusText: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
  },
  /** The loudest thing on the screen, by contrast rather than by size. */
  insight: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  openPill: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: 26,
    paddingVertical: spacing.md,
  },
  openPillText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodySmall,
  },
  pressed: {
    opacity: 0.75,
  },
  prompt: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    paddingBottom: spacing.sm,
    textAlign: 'center',
    zIndex: 3,
  },
  screen: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  stage: {
    height: STAGE,
    width: STAGE,
    zIndex: 2,
  },
  stageWrapper: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    zIndex: 2,
  },
  twinLink: {
    alignSelf: 'center',
    paddingBottom: spacing.xs,
    paddingTop: spacing.md,
  },
  twinLinkText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    letterSpacing: 0.4,
  },
});

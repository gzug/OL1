import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HUBS, type HubId, centre } from './fixtures';
import { CENTRE, DISC_RADIUS, STAGE } from './geometry';
import { Orbit } from './Orbit';
import { color } from './tokens';

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
 * order in one pass. That is the rule to review this screen against.
 */
export function HomeMockup() {
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
          <Text style={styles.twinLinkText}>⌃  Digital Twin</Text>
        </Pressable>
      </Link>

      {selecting && (
        <Pressable
          accessibilityLabel="Close the open table"
          accessibilityRole="button"
          onPress={close}
          style={styles.scrim}
        />
      )}

      <View style={styles.stageWrapper}>
        <View style={styles.stage}>
          <Orbit onHubPress={handleHubPress} selected={selected} selecting={selecting} />

          <View pointerEvents="none" style={styles.centreBox}>
            {selecting ? (
              <View style={styles.disc}>
                <Text style={styles.discText}>Open{'\n'}Table</Text>
              </View>
            ) : (
              <>
                <Text style={styles.driftNumber}>{centre.driftNumber}</Text>
                <Text style={styles.driftCaption}>{centre.driftCaption}</Text>
                <Text numberOfLines={2} style={styles.insight}>
                  {centre.insight}
                </Text>
                <View style={styles.focusPill}>
                  <Text numberOfLines={1} style={styles.focusText}>
                    {centre.focus}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {selecting && (
        <Text style={styles.prompt}>Who should be at the table?</Text>
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
            style={({ pressed }) => [styles.openPill, pressed && styles.pressed]}>
            <Text style={styles.openPillText}>Open Table</Text>
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
  const ready = selected.length > 0;
  /** Named, never counted: the number of chosen domains varies, so "asks two" breaks at one and six. */
  const names = selected.map(labelFor).join(', ');

  return (
    <View style={styles.confirmRow}>
      <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={!ready}
        onPress={onConfirm}
        style={({ pressed }) => [
          styles.confirm,
          !ready && styles.confirmInert,
          pressed && styles.pressed,
        ]}>
        <Text numberOfLines={1} style={[styles.confirmText, !ready && styles.confirmTextInert]}>
          {ready ? `Ask with ${names}` : 'Pick at least one'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    zIndex: 3,
  },
  cancel: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cancelText: {
    color: color.textQuiet,
    fontSize: 14,
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
    backgroundColor: color.accent,
    borderRadius: 22,
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  confirmInert: {
    backgroundColor: color.surface,
    borderColor: color.hairline,
    borderWidth: 1,
  },
  confirmRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  confirmText: {
    color: color.background,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmTextInert: {
    color: color.textQuiet,
    fontWeight: '500',
  },
  disc: {
    alignItems: 'center',
    backgroundColor: color.surfaceRaised,
    borderColor: color.hairline,
    borderRadius: DISC_RADIUS,
    borderWidth: 1,
    height: DISC_RADIUS * 2,
    justifyContent: 'center',
    width: DISC_RADIUS * 2,
  },
  discText: {
    color: color.textMuted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
  driftCaption: {
    color: color.textQuiet,
    fontSize: 9.5,
    letterSpacing: 0.7,
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  /** Large so it anchors, thin and grey so it never reads as today's verdict. */
  driftNumber: {
    color: color.textMuted,
    fontSize: 40,
    fontWeight: '300',
    lineHeight: 44,
  },
  focusPill: {
    backgroundColor: 'rgba(231, 255, 87, 0.10)',
    borderRadius: 13,
    marginTop: 14,
    maxWidth: 210,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  focusText: {
    color: color.accent,
    fontSize: 11.5,
  },
  /** The loudest thing on the screen, by contrast rather than by size. */
  insight: {
    color: color.text,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 16,
    textAlign: 'center',
  },
  openPill: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: color.hairline,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  openPillText: {
    color: color.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  prompt: {
    color: color.textMuted,
    fontSize: 13,
    paddingBottom: 10,
    textAlign: 'center',
    zIndex: 3,
  },
  screen: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrim: {
    backgroundColor: 'rgba(10, 13, 18, 0.72)',
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
    paddingBottom: 4,
    paddingTop: 14,
  },
  twinLinkText: {
    color: color.textQuiet,
    fontSize: 13,
    letterSpacing: 0.4,
  },
});

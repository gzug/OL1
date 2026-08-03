import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { holdForHandoff, toRef } from '@/application/chat/attachments';
import { coachChat } from '@/application/chat/coachChat';
import { toggleCoach } from '@/application/chat/threads';
import { ChatBar } from '@/ui/chat/ChatBar';
import { CoachSelector } from '@/ui/chat/CoachSelector';
import { ThreadList } from '@/ui/chat/ThreadList';
import { coachesAtTable } from '@/ui/chat/coachList';
import type { Attachment } from '@/core/attachments';
import { coachForHub, orbitHubs, type HubId } from '@/ui/hubs/catalog';
import {
  fontFamily,
  lineHeights,
  numerals,
  spacing,
  typography,
  useTheme,
} from '@/ui/theme';

import { centre } from './fixtures';
import { CENTRE, STAGE, stackBox } from './geometry';
import { Orbit } from './Orbit';

/**
 * The centre box is sized against the free space inside the ring, and that space depends on how many
 * hubs there are: `stackBox` returns the full 240×160 while the ring can be rotated clear of it, and
 * shrinks it once it cannot. `tests/orbit-geometry.test.ts` pins both halves of that.
 */

/**
 * Home.
 *
 * The bottom of this screen is the chat bar and nothing else. It used to be the Open Table button,
 * with a hub-selection mode behind it; the coach selector inside the bar does that job now, so
 * there is one place to pick who answers instead of two. `docs/decisions/0006-one-chat-surface.md`
 * records why, and what it costs.
 *
 * The orbit still lights up while the selector is open — the hubs whose coaches are picked are
 * highlighted, and tapping one toggles its coach. That is the same selection shown twice, not a
 * second way to make it, and it is why `Orbit.tsx`'s `selecting` / `selected` props are still fed
 * rather than left dead.
 *
 * One element wins per visual channel: size goes to the drift number, contrast to the weekly
 * insight, colour to the daily focus. The bar adds a fourth element to the screen and takes its
 * colour from the accent too — which is the thing to watch when reviewing this rendered, because
 * the drift number and the send button now compete for the same channel from opposite ends.
 */
type Sheet = 'coaches' | 'history' | null;

export function HomeMockup() {
  const { colors } = useTheme();
  const router = useRouter();
  /** One sheet at a time. Two booleans could both be true; this cannot. */
  const [sheet, setSheet] = useState<Sheet>(null);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const centreBox = stackBox(orbitHubs().length);

  const coaches = useMemo(() => coachesAtTable(selected), [selected]);

  /** Which hubs to light up: a hub is chosen when its own coach is at the table. */
  const chosenHubs = useMemo(
    () =>
      orbitHubs()
        .filter((hub) => hub.coachId !== undefined && selected.includes(hub.coachId))
        .map((hub) => hub.id),
    [selected],
  );

  function handleHubPress(id: HubId) {
    if (sheet !== 'coaches') {
      // A hub opens two doors — its coach, and its cockpit. `docs/decisions/0005-the-hub-model.md`
      // records why "chat is one step further in" stopped being right.
      router.push(`/hub/${id}`);
      return;
    }
    const coach = coachForHub(id);
    if (coach !== undefined) setSelected((current) => toggleCoach(current, coach.id));
  }

  async function send(text: string, attachment?: Attachment) {
    // Persist first, then navigate. What was typed reaches the conversation through the store, so
    // it never becomes a URL parameter — see `src/application/chat/coachChat.ts`. The attachment's
    // bytes cannot go that way (the store keeps metadata only), so they are held in memory for the
    // length of the navigation and taken once on the other side.
    if (attachment !== undefined) holdForHandoff(attachment);
    await coachChat.persist(selected, text, attachment === undefined ? undefined : toRef(attachment));
    setSheet(null);
    router.push(`/table?coaches=${selected.join(',')}`);
  }

  return (
    <View style={styles.screen}>
      {/* The top row is navigation. Earlier conversations belong here rather than only inside a
          chat: reaching yesterday's thread should not require starting a new one first. */}
      <View style={styles.topRow}>
        <View style={styles.topSide} />
        <Link asChild href="/twin">
          <Pressable accessibilityRole="link" style={styles.twinLink}>
            <Text style={[styles.twinLinkText, { color: colors.textMuted }]}>⌃  Digital Twin</Text>
          </Pressable>
        </Link>
        <View style={styles.topSide}>
          <Pressable
            accessibilityLabel="Earlier conversations"
            accessibilityRole="button"
            onPress={() => setSheet((open) => (open === 'history' ? null : 'history'))}
            style={({ pressed }) => [styles.earlier, pressed && styles.pressed]}>
            <Text style={[styles.earlierText, { color: colors.textMuted }]}>Earlier</Text>
          </Pressable>
        </View>
      </View>

      {sheet !== null && (
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={() => setSheet(null)}
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
        />
      )}

      <View style={styles.stageWrapper}>
        <View style={styles.stage}>
          <Orbit
            onHubPress={handleHubPress}
            selected={chosenHubs}
            selecting={sheet === 'coaches'}
          />

          {/* The centre IS the Digital Twin. It used to be the drift number, and the owner
              replaced it: "it should just say digital twin, and all the bubbles should be
              connected with the digital twin". The number was never the point of the middle — the
              twin is, and the number is one of the things it is made of, which is why it now leads
              the Twin screen instead.

              Tappable, unlike the old centre, which was `pointerEvents="none"` text. */}
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/twin')}
            style={({ pressed }) => [
              styles.centreBox,
              {
                height: centreBox.height,
                left: CENTRE - centreBox.width / 2,
                top: CENTRE - centreBox.height / 2,
                width: centreBox.width,
              },
              pressed && styles.pressed,
            ]}>
            {/* Just the name. The caption under it used to read "biological age · bloodwork 12
                Mar", which belonged to the number and became a label for nothing once the number
                moved. Everything the twin is made of is on the Twin screen, one tap away. */}
            <Text style={[styles.twinName, { color: colors.text }]}>Digital Twin</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.readout}>
        <Text numberOfLines={2} style={[styles.insight, { color: colors.text }]}>
          {centre.insight}
        </Text>
        <View style={[styles.focusPill, { backgroundColor: colors.accentSoft }]}>
          <Text numberOfLines={1} style={[styles.focusText, { color: colors.accent }]}>
            {centre.focus}
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        {sheet === 'coaches' && (
          <CoachSelector
            onClose={() => setSheet(null)}
            onToggle={(coachId) => setSelected((current) => toggleCoach(current, coachId))}
            selected={selected}
          />
        )}
        {sheet === 'history' && (
          <ThreadList
            onClose={() => setSheet(null)}
            onOpen={(ids) => router.push(`/table?coaches=${ids.join(',')}`)}
          />
        )}
        <View style={styles.barSlot}>
          <ChatBar
            coachNames={coaches.map((coach) => coach.name)}
            onOpenSelector={() => setSheet((open) => (open === 'coaches' ? null : 'coaches'))}
            onSend={(text, attachment) => void send(text, attachment)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barSlot: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  /**
   * Pinned, not laid out. As a flex child the coach sheet pushed the orbit up and out of the frame:
   * the stage is a fixed 404, so once the sheet claimed its share there was nowhere for the ring to
   * go and `space-between` shoved it under the banner. A sheet belongs OVER the screen anyway.
   */
  bottom: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 3,
  },
  centreBox: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  readout: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 2,
  },
  twinName: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 32,
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
  earlier: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  earlierText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
  },
  pressed: {
    opacity: 0.6,
  },
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    /** Room for the pinned bar, so the ring centres against what is left rather than under it. */
    paddingBottom: 74,
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
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    paddingTop: spacing.md,
    zIndex: 4,
  },
  /** Equal sides, so "Digital Twin" centres against the screen and not against what is left. */
  topSide: {
    alignItems: 'flex-end',
    flex: 1,
  },
  twinLink: {
    paddingVertical: spacing.xs,
  },
  twinLinkText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    letterSpacing: 0.4,
  },
});

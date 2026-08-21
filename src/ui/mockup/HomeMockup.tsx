import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { holdForHandoff, toRef } from '@/application/chat/attachments';
import { coachChat } from '@/application/chat/coachChat';
import { toggleCoach } from '@/application/chat/threads';
import { ChatBar } from '@/ui/chat/ChatBar';
import { ChatsDrawer } from '@/ui/chat/ChatsDrawer';
import { CoachSelector } from '@/ui/chat/CoachSelector';
import { ThreadList } from '@/ui/chat/ThreadList';
import { coachesAtTable } from '@/ui/chat/coachList';
import type { Attachment } from '@/core/attachments';
import { coachForHub, orbitHubs, ringPlaceCount, type HubId } from '@/ui/hubs/catalog';
import { useHubs } from '@/ui/hubs/useHubs';
import { BodyFigure } from '@/ui/twin/BodyFigure';
import { useMuscleLoad } from '@/ui/twin/useMuscleLoad';
import {
  fontFamily,
  lineHeights,
  numerals,
  spacing,
  typography,
  useTheme,
} from '@/ui/theme';

import { CENTRE, STAGE, stackBox } from './geometry';
import { Orbit } from './Orbit';

/**
 * The centre box is sized against the free space inside the ring, and that space depends on how many
 * hubs there are: `stackBox` returns the full 240×160 while the ring can be rotated clear of it, and
 * shrinks it once it cannot. `tests/orbit-geometry.test.ts` pins both halves of that.
 */

/** The name's own line, and the paper above it. Below that the body and the words crowd. */
const TWIN_NAME_LINE = 26;
const TWIN_NAME_GAP = 10;

/** Paper kept inside the box, so the figure never runs to the very edge of it. */
const CENTRE_INSET = 6;

/**
 * How tall the body is drawn in the centre of the orbit.
 *
 * `react-native-body-highlighter` draws 400×200 at `scale: 1`, so the scale IS the figure's height
 * as a fraction of 400 — which is what lets this say plainly what it wants: the box, less the name
 * and the paper around it. The divisor it replaces was 620, a number that happened to fit and left
 * the feet sitting directly on the D of "Digital".
 */
function figureScale(boxHeight: number): number {
  return (boxHeight - TWIN_NAME_LINE - TWIN_NAME_GAP - CENTRE_INSET) / 400;
}

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
/**
 * `chats` is the full-screen drawer; the other two are sheets that sit above the bar. They share
 * one piece of state because only one of them may ever be open.
 */
type Sheet = 'chats' | 'coaches' | 'history' | null;

export function HomeMockup() {
  const { colors } = useTheme();
  const router = useRouter();
  /** One sheet at a time. Two booleans could both be true; this cannot. */
  const [sheet, setSheet] = useState<Sheet>(null);
  const [selected, setSelected] = useState<readonly string[]>([]);
  /** Seeded plus whatever the user has made. Re-read whenever Home comes back into focus. */
  const { visible: hubs } = useHubs();
  /** The same reading the Twin screen draws, from the same sessions. Never a second calculation. */
  const load = useMuscleLoad();
  const centreBox = stackBox(ringPlaceCount(hubs));

  const coaches = useMemo(() => coachesAtTable(selected), [selected]);

  /** Which hubs to light up: a hub is chosen when its own coach is at the table. */
  const chosenHubs = useMemo(
    () =>
      orbitHubs(hubs)
        .filter((hub) => hub.coachId !== undefined && selected.includes(hub.coachId))
        .map((hub) => hub.id),
    [hubs, selected],
  );

  function handleHubPress(id: HubId) {
    if (sheet !== 'coaches') {
      // A hub opens two doors — its coach, and its cockpit. `docs/decisions/0005-the-hub-model.md`
      // records why "chat is one step further in" stopped being right.
      router.push(`/hub/${id}`);
      return;
    }
    const coach = coachForHub(id, hubs);
    if (coach !== undefined) setSelected((current) => toggleCoach(current, coach.id));
  }

  async function send(text: string, attachment?: Attachment) {
    // Persist first, then navigate. What was typed reaches the conversation through the store, so
    // it never becomes a URL parameter — see `src/application/chat/coachChat.ts`. The attachment's
    // bytes cannot go that way (the store keeps metadata only), so they are held in memory for the
    // length of the navigation and taken once on the other side.
    if (attachment !== undefined) holdForHandoff(attachment);

    /**
     * A send from Home starts a NEW conversation, every time — the same as typing into the box on
     * Claude's home screen. The owner asked for exactly that comparison. Earlier conversations are
     * not lost by it: they are one tap away under "Earlier", and on their hub.
     */
    const thread = await coachChat.start(selected);
    await coachChat.persist(
      thread,
      selected,
      text,
      attachment === undefined ? undefined : toRef(attachment),
    );
    setSheet(null);
    router.push(`/table?coaches=${selected.join(',')}&thread=${thread}`);
  }

  return (
    <View style={styles.screen}>
      {/* The top row is navigation. Earlier conversations belong here rather than only inside a
          chat: reaching yesterday's thread should not require starting a new one first. */}
      <View style={styles.topRow}>
        {/**
          * Replays the first run. **It is here for demonstrating the app**, which the owner asked
          * for on 2026-08-21 — the flow is otherwise reachable exactly once per browser, and the
          * best-written screens in OL1 were the ones nobody could see twice.
          *
          * It replays rather than resets: nothing is cleared, no hub is removed, and the profile is
          * only overwritten if somebody answers again. Walking through and leaving costs nothing.
          */}
        <View style={styles.topSideLeft}>
          {/**
            * **A word, not three lines.** A hamburger says "app with a menu"; this says what is
            * behind it and leaves the ring the loudest thing on the screen — the owner's call on
            * 2026-08-21, and the reason the drawer opens by button rather than by swipe is that on
            * Android a swipe from the left edge is the system Back gesture.
            *
            * A plain `Pressable`, not a `Link asChild`: wrapped that way the style never applies,
            * which cost this button its padding and its pressed state once already.
            */}
          <Pressable
            accessibilityLabel="Your conversations"
            accessibilityRole="button"
            onPress={() => setSheet('chats')}
            style={({ pressed }) => [styles.onboarding, pressed && styles.pressed]}>
            <Text style={[styles.earlierText, { color: colors.textMuted }]}>Chats</Text>
          </Pressable>
        </View>
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

      {sheet !== null && sheet !== 'chats' && (
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={() => setSheet(null)}
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
        />
      )}

      {/* Full screen, over everything including the bar. A partial drawer would leave the ring
          half-visible behind it, which reads as an accident rather than as a place. */}
      {sheet === 'chats' && (
        <View style={styles.drawerLayer}>
          <ChatsDrawer onClose={() => setSheet(null)} />
        </View>
      )}

      <View style={styles.stageWrapper}>
        <View style={styles.stage}>
          <Orbit
            hubs={hubs}
            onAddPress={() => router.push('/new-hub')}
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
            {/* The body, small, with the name under it.
                
                The owner asked for the figure to be "visible in small already in the home page",
                and for the words to stay: `docs/decisions/0008-the-centre-names-itself.md` is why a
                picture alone is not enough — the centre has to say what it is.

                No caption, no legend and no tapping at this size. A muscle here is about four
                pixels across, so a tap could not say which one it meant, and a legend would not fit
                under it. It is a picture that leads to the screen where all three exist. */}
            <BodyFigure loads={load.loads} scale={figureScale(centreBox.height)} showCaption={false} />
            <Text style={[styles.twinName, { color: colors.text }]}>Digital Twin</Text>
          </Pressable>
        </View>
      </View>

      {/**
        * **Two fixtures used to sit here and they are gone.**
        *
        * "Your later nights landed on evening training days." and a pill reading "Today · the
        * evening walk". Neither was computed; nothing in the app could compute them. The only
        * health metric the port defines is `steps`, its adapter reports `unavailable` on every
        * device, and there is no bedtime anywhere for a pattern to be drawn from. The sentence
        * began with "Your". The pill said "Today" and said the identical thing tomorrow, and to
        * somebody who had logged nothing at all.
        *
        * They were the worst-placed fixtures in the app: directly under a body figure drawn from
        * the person's own logged sessions, above a working chat bar, and on the one screen with no
        * sample-data line — so they sat inside the same visual block as real output.
        *
        * Home is the ring and the bar until something real belongs between them. Adding a
        * sample-data line to this screen purely to keep two invented sentences would have been the
        * worse of the two answers. `docs/decisions/0013` is the class this belongs to.
        */}

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
            onOpen={(thread, ids) => router.push(`/table?coaches=${ids.join(',')}&thread=${thread}`)}
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
  twinName: {
    fontFamily: fontFamily.display,
    /* Sized against the figure above it rather than against the screen. At 26 the two words were
       wider than the body was tall, which read as a caption with a mascot on it. */
    fontSize: 22,
    lineHeight: TWIN_NAME_LINE,
    marginTop: TWIN_NAME_GAP,
    textAlign: 'center',
  },
  /** The loudest thing on the screen, by contrast rather than by size. */
  earlier: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  /** Mirrors `earlier` on the other side of the row, left-aligned rather than right. */
  onboarding: {
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
  drawerLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
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
  topSideLeft: {
    alignItems: 'flex-start',
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

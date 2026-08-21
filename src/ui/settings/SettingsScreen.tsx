import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COPY as FIRST_RUN } from '@/ui/onboarding/firstRun';
import {
  fontFamily,
  lineHeights,
  spacing,
  typography,
  useTheme,
} from '@/ui/theme';

import { AboutYouSection } from './AboutYouSection';
import { CoachBriefsSection } from './CoachBriefsSection';
import { GoalsSection } from './GoalsSection';
import { HubsSection } from './HubsSection';
import { Note, Row, Section, styles as shared } from './parts';
import { TrainingSection } from './TrainingSection';
import { COPY, tally, tallyLine, type EntriesByHub } from './settings';
import { useSettings } from './useSettings';

/**
 * Settings.
 *
 * **Onboarding asks once. This is the same questions, any time.** The first run asks five screens
 * of them and there was nowhere to change a single answer afterwards — a height, a goal and the
 * shape of the ring were all one-way doors. Every question here is one `firstRun.ts` already asks,
 * with its labels and its caveats imported rather than re-typed.
 *
 * **It is a route that stands on its own.** The conversation drawer being built in a parallel
 * session has a gear at its foot, and this is what the gear opens; nothing here reaches into Home,
 * and Home does not yet reach here. `/settings` is a static segment, so `cleanUrls` serves it on
 * the preview and no rewrite is needed.
 *
 * **Nothing on this screen deletes anything**, which is the owner's decision of 2026-08-21 restated
 * one level up: a hub is put away rather than removed, a goal is dropped rather than erased, and
 * the count at the bottom says what it is a count of. There is no danger zone, because there is
 * nothing here that a person could do once, at speed, and not take back.
 *
 * What the previous app's settings had and this deliberately does not: a display name, a timezone,
 * unit preferences, connected sources, wearables, screen time, reminders. Each would be a claim
 * with nothing behind it — the exact class `docs/decisions/0013` exists to stop.
 */
export function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, profile, reload } = useSettings();

  return (
    <View style={local.screen}>
      <View style={local.top}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [local.back, pressed && shared.pressed]}>
          <Text style={[local.backText, { color: colors.textMuted }]}>{'‹  Home'}</Text>
        </Pressable>
        <Text style={[local.title, { color: colors.text }]}>{COPY.title}</Text>
        {/* Balances the back link so the title sits centred without measuring anything. */}
        <View style={local.back}>
          <Text style={[local.backText, { color: 'transparent' }]}>{'‹  Home'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={local.body} keyboardShouldPersistTaps="handled">
        <Text style={[local.intro, { color: colors.textMuted }]}>{COPY.intro}</Text>

        <AboutYouSection onSaved={reload} profile={profile} />

        {/* Nothing below is drawn from a value that also means "not read yet". A chip rendered
            unticked before the store has answered is a claim that somebody does not want something
            they may well have asked for — shape 1 of 0013, and the cheapest mistake to make here. */}
        {data.status === 'failed' && (
          <View style={shared.section}>
            <Note text={COPY.unread} />
          </View>
        )}

        {data.status === 'ready' && (
          <>
            <GoalsSection data={data.value} onChanged={reload} />
            <TrainingSection data={data.value} onChanged={reload} />
            <HubsSection data={data.value} onChanged={reload} />
            <CoachBriefsSection data={data.value} />
          </>
        )}

        <Section hint={COPY.replayHint} title={COPY.replayTitle}>
          <Row action="›" label={COPY.replay} onPress={() => router.push('/welcome')} />
        </Section>

        {data.status === 'ready' && <Stored entries={data.value.entries} />}
      </ScrollView>
    </View>
  );
}

/**
 * What is written down, and where it is.
 *
 * The count is every entry in every hub, worded with the vocabulary the rest of the app uses. The
 * storage sentence differs by surface because the truth does: on the web preview this is a browser
 * store that goes when the browser's data is cleared, and saying anything warmer than that would
 * repeat Legacy's audit finding #3 — a privacy line that was simply false.
 */
function Stored({ entries }: { entries: EntriesByHub }) {
  const { colors } = useTheme();
  const counts = tally(entries);

  return (
    <Section title={COPY.storedTitle}>
      {counts.length > 0 && (
        <>
          <Text style={[local.count, { color: colors.text }]}>{tallyLine(counts)}</Text>
          <Note text={COPY.storedNote} />
        </>
      )}
      <Note text={Platform.OS === 'web' ? FIRST_RUN.storageWeb : FIRST_RUN.storageNative} />
      <Note text={FIRST_RUN.noAccount} />
    </Section>
  );
}

const local = StyleSheet.create({
  back: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  backText: { fontFamily: fontFamily.body, fontSize: typography.caption },
  body: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  count: { fontFamily: fontFamily.medium, fontSize: typography.body, marginTop: spacing.sm },
  intro: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  screen: { flex: 1 },
  title: { fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 28 },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});

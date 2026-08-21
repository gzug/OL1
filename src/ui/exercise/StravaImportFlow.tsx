import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { attachments, pickProblem } from '@/application/chat/attachments';
import {
  parseStravaCsv,
  sessionPayloadOf,
  type StravaImport,
} from '@/application/exercise/stravaCsv';
import { hubs } from '@/application/hubs/hubs';
import { fontFamily, lineHeights, radius, spacing, tracking, typography, useTheme } from '@/ui/theme';

/**
 * Bringing your Strava history in, from the export Strava emails you.
 *
 * **The export, not the API.** Strava's API needs OAuth and a client secret, and a secret cannot
 * ship inside an app — that needs a server OL1 does not have. The export needs none of it, works on
 * any platform, and carries the whole history rather than a rate-limited window. The owner also
 * reports that what Strava writes to Health Connect is vague rather than session-accurate, so the
 * pipeline already planned for the phone does not remove the need for this.
 *
 * **Half this screen is instructions**, and that is the design rather than filler. The export is
 * not in Strava's mobile app at all — it is a website request that arrives by email hours later,
 * and it sits two clicks from a button that deletes your account. Somebody who cannot find the file
 * cannot use the feature, so the finding is the feature.
 */

const STEPS = [
  'On strava.com — not the app — open your picture, top right, then Settings.',
  'My Account, then scroll to “Download or Delete Your Account”.',
  'Press Get Started, then “Request your archive” under step 2.',
  'Strava emails you a ZIP. Usually hours; it can be a day.',
  'Inside it is activities.csv. That is the only file this reads.',
] as const;

export function StravaImportFlow() {
  const { colors } = useTheme();
  const router = useRouter();
  const [found, setFound] = useState<StravaImport | null>(null);
  const [fileName, setFileName] = useState('');
  const [pickNote, setPickNote] = useState<string | null>(null);
  const [state, setState] = useState<'failed' | 'idle' | 'importing' | 'imported' | 'reading'>('idle');

  async function choose() {
    setState('reading');
    setPickNote(null);

    /**
     * The picker never rejects — a cancelled dialog and a denied permission are ordinary outcomes,
     * and `pickProblem` already turns each into a sentence. Reusing it means this screen says the
     * same thing the chat bar does about the same failure.
     */
    const result = await attachments.pickDocument();

    if (result.status !== 'ok') {
      setState('idle');
      setPickNote(pickProblem(result));
      return;
    }

    setFileName(result.attachment.name);
    setFound(parseStravaCsv(attachments.textOf(result.attachment.bytes)));
    setState('idle');
  }

  async function bringIn() {
    if (found === null) return;
    setState('importing');
    try {
      for (const activity of found.activities) {
        /**
         * `recordedAt` is when the session HAPPENED, and the wall-clock is all Strava's export
         * gives — no timezone, anywhere in the file. Midday is used rather than midnight so a
         * session cannot slide into the previous day when it is read back in another zone. The
         * date a person sees is the date the export said.
         */
        await hubs.add('exercise', 'session', sessionPayloadOf(activity), {
          recordedAt: `${activity.localDate}T12:00:00.000Z`,
          source: 'manual',
        });
      }
      setState('imported');
    } catch {
      setState('failed');
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Link asChild href="/hub/exercise">
          <Pressable accessibilityRole="link" style={styles.back}>
            <Text style={[styles.backText, { color: colors.textMuted }]}>← Exercise</Text>
          </Pressable>
        </Link>
        <Text style={[styles.title, { color: colors.text }]}>From Strava</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.question, { color: colors.text }]}>Bring your history in.</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Everything you have ever logged on Strava, in one file. It is read on your device and
          nothing is sent anywhere.
        </Text>

        <Text style={[styles.heading, { color: colors.textSubtle }]}>GETTING THE FILE</Text>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.step}>
            <Text style={[styles.stepNumber, { color: colors.textSubtle }]}>{index + 1}</Text>
            <Text style={[styles.stepText, { color: colors.textMuted }]}>{step}</Text>
          </View>
        ))}
        {/* Said plainly because the two buttons are next to each other on Strava's own page. */}
        <Text style={[styles.warn, { color: colors.warning }]}>
          Step 3 on that page deletes your Strava account. You want step 2.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={state === 'reading'}
          onPress={() => void choose()}
          style={({ pressed }) => [
            styles.choose,
            { borderColor: colors.hairline },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.chooseText, { color: colors.text }]}>
            {state === 'reading' ? 'Reading…' : 'Choose activities.csv'}
          </Text>
        </Pressable>

        {pickNote !== null && (
          <Text style={[styles.warn, { color: colors.warning }]}>{pickNote}</Text>
        )}

        {found !== null && found.problem !== null && (
          <Text style={[styles.warn, { color: colors.danger }]}>{found.problem}</Text>
        )}

        {found !== null && found.problem === null && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.count, { color: colors.text }]}>
              {found.activities.length} {found.activities.length === 1 ? 'session' : 'sessions'}
            </Text>
            <Text style={[styles.note, { color: colors.textSubtle }]}>
              from {fileName}
              {found.activities.length > 0 &&
                `, ${found.activities[0]?.localDate} to ${found.activities[found.activities.length - 1]?.localDate}`}
            </Text>

            {/* Said out loud rather than absorbed. A number that quietly differs from the file's
                row count is the kind of thing nobody can check afterwards. */}
            {found.duplicates > 0 && (
              <Text style={[styles.note, { color: colors.textSubtle }]}>
                {found.duplicates} {found.duplicates === 1 ? 'row was' : 'rows were'} the same
                session recorded twice — a watch and a phone both running. Counted once.
              </Text>
            )}
            {found.skipped > 0 && (
              <Text style={[styles.note, { color: colors.textSubtle }]}>
                {found.skipped} {found.skipped === 1 ? 'row was' : 'rows were'} missing a date or a
                length and could not be read.
              </Text>
            )}

            {state !== 'imported' && found.activities.length > 0 && (
              <Pressable
                accessibilityRole="button"
                disabled={state === 'importing'}
                onPress={() => void bringIn()}
                style={({ pressed }) => [
                  styles.confirm,
                  { backgroundColor: colors.accent },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.confirmText, { color: colors.onAccent }]}>
                  {state === 'importing' ? 'Bringing them in…' : 'Add them to Exercise'}
                </Text>
              </Pressable>
            )}

            {state === 'imported' && (
              <>
                <Text style={[styles.note, { color: colors.textMuted }]}>
                  In Exercise. The body figure reads the last seven days of them.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/hub/exercise')}
                  style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                  <Text style={[styles.secondaryText, { color: colors.accent }]}>Open Exercise</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {state === 'failed' && (
          <Text style={[styles.warn, { color: colors.warning }]}>
            That did not work, and nothing was changed. Try again.
          </Text>
        )}

        {/* The honest limit of a file with no timezone in it, before anybody notices it themselves. */}
        <Text style={[styles.note, { color: colors.textSubtle }]}>
          Strava’s export gives the time you saw on the clock, with no timezone. Dates come across
          exactly as the file has them; the hour is not used for anything.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { minWidth: 80, paddingVertical: spacing.xs },
  backText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  body: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  card: { borderRadius: radius.md, marginTop: spacing.lg, padding: spacing.md },
  choose: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  chooseText: { fontFamily: fontFamily.medium, fontSize: typography.body },
  confirm: {
    alignItems: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  confirmText: { fontFamily: fontFamily.semi, fontSize: typography.body },
  count: { fontFamily: fontFamily.display, fontSize: 30, lineHeight: 36 },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerSide: { minWidth: 80 },
  heading: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    lineHeight: lineHeights.bodySmall,
    marginTop: spacing.xs,
  },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  question: {
    fontFamily: fontFamily.display,
    fontSize: typography.heroInterpretation,
    letterSpacing: tracking.tight,
  },
  secondary: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.sm },
  secondaryText: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  screen: { flex: 1 },
  step: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stepNumber: { fontFamily: fontFamily.medium, fontSize: typography.caption, minWidth: 14 },
  stepText: {
    flexShrink: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
  },
  title: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  warn: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
});

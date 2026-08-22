import { Link } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { hubs } from '@/application/hubs/hubs';
import { fontFamily, radius, spacing, typography, useTheme } from '@/ui/theme';
import { AboutYou } from '@/ui/twin/AboutYou';
import { BioAgeBlock } from '@/ui/twin/BioAgeBlock';
import { Ledger } from '@/ui/twin/Ledger';
import { bloodWorkSource } from '@/ui/twin/bioAgeCopy';
import { BodyFigure } from '@/ui/twin/BodyFigure';
import { DomainCards } from '@/ui/twin/DomainCards';
import { useBioAge } from '@/ui/twin/useBioAge';
import { twinSources } from '@/ui/twin/sources';
import { useMuscleLoad } from '@/ui/twin/useMuscleLoad';

/**
 * Digital Twin.
 *
 * Scroll order is an argument, not a preference:
 *   the number     — PhenoAge, and immediately under it what it is actually made of. It leads
 *                    because the spec calls the twin the core idea of the app, and because a number
 *                    this heavy has to arrive with its provenance rather than acquire it later
 *   person file    — whose twin is this, and what does it already know
 *   running test   — the only time-bound thing here, and the only thing you are inside
 *   today's ask    — pinned directly under it, styled exactly like Home's daily focus, so the rule
 *                    that the two never compete is visible rather than merely asserted
 *   insights       — read, not acted on
 *   completed      — evidence sits under the claim it supports
 *   ledger         — what you have actually recorded, anywhere in the app
 *
 * A running test lives here rather than on Home because it shows nothing for thirteen days out of
 * fourteen, and the centre of Home cannot carry a permanently static element.
 *
 * **The order above is now cut by one line that outranks all of it: real, then invented.**
 *
 * The scroll order was argued when every block on this screen was a fixture, and "longest, densest,
 * least urgent last" was the right axis then. It is not any more. The body figure, the biological
 * age, what it is made of and the ledger are the person's own; the sample person, the running test,
 * the insights and the completed tests are invented for layout. With those interleaved — a real age,
 * then a sample person, then a real ledger — no reading of the screen separated them, and the hub
 * screens had drawn this line while the Twin had not. The ledger moved up above the boundary rather
 * than the boundary moving down around it, because a marker that has to make exceptions is not a
 * marker.
 *
 * **The body leads, and the number sits under it.** The owner asked for that on 2026-08-19 —
 * the twin is a body with the muscles you have worked lately, and PhenoAge is one of the things it
 * is made of. The order still argues the same case the scroll order always did: a heavy claim
 * arrives with its provenance, it just arrives second now.
 */
export function TwinMockup() {
  const { colors } = useTheme();
  const load = useMuscleLoad();
  /* Read once here rather than twice below: the number and the row that says what it is made of
     must be the same answer, and two hooks would be two reads of a store that can change between
     them. */
  const bioAge = useBioAge();

  /** Tapping a muscle records that you worked it. You were there; nothing here knows better. */
  async function markWorked(slug: string) {
    await hubs.add('exercise', 'worked', { muscles: [slug] }, { source: 'manual' });
    /* And look again. The write was always correct; without this the figure did not move until the
       Twin was reopened, which reads as a control that does nothing. */
    load.reread();
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Link asChild href="/">
        <Pressable accessibilityRole="link" style={styles.homeLink}>
          <Text style={[styles.homeLinkText, { color: colors.textMuted }]}>⌄  Home</Text>
        </Pressable>
      </Link>

      <View style={styles.bodyBlock}>
        <BodyFigure
          loads={load.loads}
          onMusclePress={(slug) => void markWorked(slug)}
          read={load.read}
          unplaced={load.unplaced}
        />

        {/* Under the figure, because both answers are about what it draws and what the number
            beneath it is calculated against. Collapsed until tapped: a form under a body is a form
            nobody wants, and the summary line is enough once it is answered. */}
        <AboutYou />
      </View>

      {/* Was `centre.driftNumber` — a fixture reading 41.6 that had been on this screen since the
          first mockup, looking exactly like a result. It is your own panel now, or an honest line
          saying what is missing. */}
      <BioAgeBlock bioAge={bioAge} />

      <Section title="What this number is made of">
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* The one source that feeds the number, from the number's own state. It was a fixture
              claiming nine of nine markers, which contradicted the line above it the moment that
              line became real. */}
          {/* Nothing before a successful read: an empty detail is the state saying it has no claim
              to make, not a row with a missing value. */}
          {bioAge.status !== 'unknown' && <SourceRow source={bloodWorkSource(bioAge)} />}
          {/* Only once there IS a reading. Under an empty state it promised a second panel would
              improve a number that did not exist yet. */}
          {bioAge.status === 'ready' && (
            <Text style={[styles.cardNote, { color: colors.textSubtle }]}>
              A second panel is what turns this from a reading into a direction.
            </Text>
          )}
        </View>
      </Section>

      <Section title="What else the twin reads">
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {twinSources.map((source, index) => (
            <Fragment key={source.label}>
              {index > 0 && (
                <View style={[styles.rowRule, { backgroundColor: colors.borderSubtle }]} />
              )}
              <SourceRow source={source} />
            </Fragment>
          ))}
        </View>
      </Section>

      {/**
        * Every domain, saying what it currently knows — the spec's own claim, on screen at last:
        * *One twin, fed by every domain, is the claim the orbit exists to make.* Home draws each hub
        * connected to the centre, and until this landed, opening the centre proved nothing.
        *
        * It sits under the number and its sources rather than above them because the drift number
        * leads the Twin by the same spec line, and because these cards are what the number sits in
        * the middle of rather than a competitor to it.
        */}
      <DomainCards />

      {/* Was four invented rows under a footer reading "Showing 4 of 148", where 148 was a number
          nobody could stand behind. `Ledger` renders nothing at all until something is logged, so a
          person who has recorded nothing sees no section rather than somebody else's history. */}
      {/* No wrapper. `Ledger` owns its heading so that an empty one takes the heading with it —
          the word LEDGER over an empty white box reached the deployed screen once. */}
      <Ledger />

    </ScrollView>
  );
}

function SourceRow({
  source,
}: {
  source: { detail: string; label: string; state: 'missing' | 'reading' };
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.sourceRow}>
      <View
        style={[
          styles.dot,
          source.state === 'reading'
            ? { backgroundColor: colors.accent }
            : { borderColor: colors.hairline, borderWidth: 1 },
        ]}
      />
      <Text style={[styles.sourceLabel, { color: colors.text }]}>{source.label}</Text>
      <Text numberOfLines={1} style={[styles.sourceDetail, { color: colors.textMuted }]}>
        {source.detail}
      </Text>
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  bodyBlock: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    marginRight: spacing.sm,
    width: 8,
  },
  sourceDetail: {
    flexShrink: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    textAlign: 'right',
  },
  sourceLabel: {
    flexGrow: 1,
    fontFamily: fontFamily.body,
    fontSize: typography.bodySmall,
    paddingRight: spacing.sm,
  },
  sourceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  cardNote: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: spacing.sm,
  },
  content: {
    paddingBottom: 48,
    paddingHorizontal: spacing.lg,
  },
  /** Styled exactly like Home's daily focus, so the repeat reads as the same object. */
  homeLink: {
    alignSelf: 'center',
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  homeLinkText: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    letterSpacing: 0.4,
  },
  rowRule: {
    height: 1,
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    fontFamily: fontFamily.strong,
    fontSize: 11,
    letterSpacing: 0.9,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
});

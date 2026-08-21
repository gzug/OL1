import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BioAgeDriver, BioAgeDrivers } from '@/application/labs/phenoAge';
import type { BioAge } from '@/application/twin/bioAge';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';
import { drawnOn, markerName, missingLine, waitingLine, years } from '@/ui/twin/bioAgeCopy';

/**
 * The number under the body — your biological age, from your own panel.
 *
 * **This replaces a hard-coded 41.6 that had been on the screen since the first mockup.** The
 * calculator arrived on 3 August and the drivers on 20 August; neither had ever been connected to
 * anything, so the Twin showed a decorative figure to everyone who opened it. That is the most
 * expensive kind of placeholder, because it looks exactly like a result and nobody reports it as
 * broken.
 *
 * Four states, and each one says which it is:
 *
 * - **waiting** — no panel, or no birth year. Both are required and neither is guessed;
 *   chronological age is an argument to the formula rather than a nicety. Saying WHICH is missing
 *   is what separates a screen that is waiting from one that is broken.
 * - **calibrating** — under six markers. No figure at all, not a wide one with an apology.
 * - **ready, bracketed** — a partial panel prints as a range.
 * - **ready, whole** — one number and the date the blood was drawn.
 *
 * The number is years with a decimal, never an index out of 100 — `docs/decisions/0009` settles
 * why: this app scores a week, not a person, and the one number describing a body is a measurement
 * rather than a grade.
 *
 * The state is a prop rather than a hook call, because `TwinMockup` renders the row that says what
 * the number is made of and the two must be the same answer.
 */
export function BioAgeBlock({ bioAge }: { bioAge: BioAge }) {
  const { colors } = useTheme();

  /**
   * **No placeholder glyph while it waits.** A `—` set at the number's own 40px reads as a
   * horizontal rule rather than as an absent value; it went out on the deployed preview looking
   * exactly like a divider. There is no number, so there is no number-shaped thing.
   */
  /** Nothing looked up yet, or the lookup failed. Neither is something to tell somebody. */
  if (bioAge.status === 'unknown') return null;

  if (bioAge.status === 'waiting') {
    return (
      <View style={styles.block}>
        <Text style={[styles.caption, { color: colors.textSubtle }]}>
          {waitingLine(bioAge.reason)}
        </Text>
        {bioAge.reason === 'noPanel' && (
          <Link asChild href="/add-panel">
            <Pressable accessibilityRole="link" style={styles.action}>
              <Text style={[styles.actionText, { color: colors.accent }]}>Add a panel</Text>
            </Pressable>
          </Link>
        )}
      </View>
    );
  }

  if (bioAge.status === 'calibrating') {
    return (
      <View style={styles.block}>
        <Text style={[styles.caption, { color: colors.textSubtle }]}>
          {missingLine(bioAge.range)}
        </Text>
      </View>
    );
  }

  const { drawnAt, drivers, range } = bioAge;
  const whole = range.missing.length === 0;

  return (
    <View style={styles.block}>
      {/* A partial panel prints the bracket it actually is. A midpoint shown alone would be a
          precision the panel does not have, and it is the easy mistake here. */}
      <Text style={[styles.number, { color: colors.text }]}>
        {whole ? years(range.point) : `${years(range.low)}–${years(range.high)}`}
      </Text>
      {/* The owner asked for this: a way in to how the number was reached and which values were
          used. It sits on the caption rather than beside the figure so it never competes with it. */}
      <Link asChild href="/bio-age-method">
        <Pressable accessibilityRole="link" style={styles.explain}>
          <Text style={[styles.caption, { color: colors.textSubtle }]}>
            Biological age · bloodwork {drawnOn(drawnAt)}
          </Text>
          <Text style={[styles.explainLink, { color: colors.accent }]}>
            ⓘ How this was worked out
          </Text>
        </Pressable>
      </Link>
      {!whole && (
        <Text style={[styles.caption, { color: colors.textSubtle }]}>{missingLine(range)}</Text>
      )}
      {drivers !== null && <Drivers drivers={drivers} />}
    </View>
  );
}

/**
 * Which markers are moving it, and in which direction. **Never by how much.**
 *
 * `BioAgeDriver` carries no quantity — only a direction and a position in an order — so there is no
 * way to render “your CRP is costing you 3.2 years” from this path even by accident. That sentence
 * is a clinical claim dressed as arithmetic, from a population regression, about one blood draw.
 * The type refusing to carry the number is the guard; this only spends it correctly.
 */
function Drivers({ drivers }: { drivers: BioAgeDrivers }) {
  const { colors } = useTheme();
  const name = (driver: BioAgeDriver) => markerName(driver.key);

  if (drivers.pushingUp.length === 0 && drivers.helpingDown.length === 0) return null;

  return (
    <View style={styles.drivers}>
      {drivers.pushingUp.length > 0 && (
        <Text style={[styles.driverLine, { color: colors.textMuted }]}>
          Reading it higher: {drivers.pushingUp.map(name).join(', ')}
        </Text>
      )}
      {drivers.helpingDown.length > 0 && (
        <Text style={[styles.driverLine, { color: colors.textMuted }]}>
          Reading it lower: {drivers.helpingDown.map(name).join(', ')}
        </Text>
      )}
      {/* The sentence that stops the two lines above being read as a verdict. */}
      <Text style={[styles.driverNote, { color: colors.textSubtle }]}>
        Compared with a reference group, not with a target. Nothing here says a value is good or bad.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  action: { paddingVertical: spacing.sm },
  actionText: { fontFamily: fontFamily.medium, fontSize: typography.bodySmall },
  block: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  caption: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  driverLine: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    textAlign: 'center',
  },
  driverNote: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  drivers: { gap: 2, marginTop: spacing.md },
  explain: { alignItems: 'center' },
  explainLink: {
    fontFamily: fontFamily.medium,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  // The size the Twin's number has always been. Literals because that is how `TwinMockup` held it —
  // this block replaces that markup, it does not get to change the typography with it.
  number: { fontFamily: fontFamily.display, fontSize: 40, lineHeight: 46 },
});

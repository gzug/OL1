import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BioAgeDriver, BioAgeDrivers, PhenoAgeRange } from '@/application/labs/phenoAge';
import { LEVINE_MARKERS } from '@/ui/labs/levine';
import { fontFamily, lineHeights, spacing, typography, useTheme } from '@/ui/theme';
import { useBioAge } from '@/ui/twin/useBioAge';

/**
 * The number under the body — your biological age, from your own panel.
 *
 * **This replaces a hard-coded 41.6 that had been on the screen since the first mockup.** The
 * calculator arrived on 3 August and the drivers on 20 August; neither had ever been connected to
 * anything, so the Twin has been showing a decorative figure to everyone who opened it. That is the
 * defect this fixes, and it is worth naming: a fixture that looks exactly like a result is the most
 * expensive kind, because nobody reports it as broken.
 *
 * Four states, and each one says which it is:
 *
 * - **waiting** — no panel, or no birth year. Both are required inputs and neither is guessed;
 *   chronological age is an argument to the formula, not a nicety. The screen says which is
 *   missing and offers the way to supply it, because "waiting" and "broken" look identical
 *   otherwise.
 * - **calibrating** — fewer than six markers. No figure at all, not a wide one with an apology.
 * - **ready, bracketed** — a partial panel gets a RANGE, printed as a range.
 * - **ready, whole** — nine markers, one number, and the date the blood was drawn beside it.
 *
 * The number is always years with a decimal, never an index out of 100. `docs/decisions/0009`
 * settles why: this app scores a week, not a person, and the one number that describes a body is a
 * measurement rather than a grade.
 */

const MARKER_LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  LEVINE_MARKERS.map((marker) => [marker.key, marker.label]),
);

/** Years, one decimal. `Math.round` on tenths rather than `toFixed`, so −0.04 cannot print as “-0.0”. */
function years(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function drawnOn(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? 'an unknown date'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function BioAgeBlock() {
  const { colors } = useTheme();
  const bioAge = useBioAge();

  if (bioAge.status === 'waiting') {
    return (
      <View style={styles.block}>
        <Text style={[styles.waitingNumber, { color: colors.textSubtle }]}>—</Text>
        <Text style={[styles.caption, { color: colors.textSubtle }]}>
          {bioAge.reason === 'noPanel'
            ? 'Biological age needs a blood panel. Nothing has been added yet.'
            : 'Biological age needs the year you were born. It is not stored until you give it.'}
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
        <Text style={[styles.waitingNumber, { color: colors.textSubtle }]}>—</Text>
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
      <Text style={[styles.caption, { color: colors.textSubtle }]}>
        Biological age · bloodwork {drawnOn(drawnAt)}
      </Text>
      {!whole && (
        <Text style={[styles.caption, { color: colors.textSubtle }]}>{missingLine(range)}</Text>
      )}
      {drivers !== null && <Drivers drivers={drivers} />}
    </View>
  );
}

function missingLine(range: PhenoAgeRange): string {
  const names = range.missing.map((key) => MARKER_LABEL[key] ?? key);
  const count = names.length;
  if (count === 0) return 'All nine markers are present.';
  if (range.status === 'calibrating') {
    return `${range.markersPresent} of 9 markers. Six are needed before this can say anything honest.`;
  }
  return count === 1
    ? `A range rather than a figure: ${names[0]} was not on the panel.`
    : `A range rather than a figure: ${count} markers were not on the panel.`;
}

/**
 * Which markers are moving it, and in which direction. **Never by how much.**
 *
 * `BioAgeDriver` carries no quantity — only a direction and a position in an order — so there is no
 * way to render "your CRP is costing you 3.2 years" from this path even by accident. That sentence
 * is a clinical claim dressed as arithmetic, from a population regression, about one blood draw.
 * The type refusing to carry the number is the guard; this component just spends it correctly.
 */
function Drivers({ drivers }: { drivers: BioAgeDrivers }) {
  const { colors } = useTheme();
  const name = (driver: BioAgeDriver) => MARKER_LABEL[driver.key] ?? driver.key;

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
  // The size the Twin's number has always been. Kept as literals because that is how `TwinMockup`
  // held it — this block replaces that markup, it does not get to change the typography with it.
  number: { fontFamily: fontFamily.display, fontSize: 40, lineHeight: 46 },
  waitingNumber: { fontFamily: fontFamily.display, fontSize: 40, lineHeight: 46 },
});

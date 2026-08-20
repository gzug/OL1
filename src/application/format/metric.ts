/**
 * The one place a measured value becomes text.
 *
 * **PORTED from Legacy `data/metricFormat.ts`**, and the reason it exists is worth carrying with
 * it. On 2026-07-27 the owner opened a live preview and found a night of sleep printed as `417.4`.
 * The cause was not one missing unit: the field carried its own local formatter, because there was
 * no shared answer to "how is a value written down" — and the same screen already formatted the
 * same night twice more, through two other private formatters that agreed only by luck.
 *
 * So this owns exactly two decisions:
 *
 * 1. Which unit each thing is written in.
 * 2. How a duration is written down, once, app-wide.
 *
 * It deliberately does NOT own thresholds, bands, polarity or any judgement. `muscleLoad.ts` and
 * `score.ts` own those. This turns a number into text and stops.
 *
 * **A non-finite value returns null rather than a string.** That is the absence law — a blank is
 * absent, never zero — enforced in the one place it is cheapest to enforce: a caller has to decide
 * what absence looks like instead of printing "NaN" or quietly showing a 0.
 *
 * Legacy guards this with a script that fails if a second hours/minutes formatter appears anywhere.
 * `scripts/check-duration-formatters.mjs` is that guard, ported for the same reason.
 */

/** Everything this app can currently write down. Ours, not Legacy's — its list is wearable metrics. */
export type MetricKey =
  | 'bioAge'
  | 'calories'
  | 'carbs'
  | 'distance'
  | 'fat'
  | 'fibre'
  | 'protein'
  | 'sessions'
  | 'sleep'
  | 'training'
  | 'weight';

/**
 * How one value is written.
 *
 * - `duration` — the stored number is MINUTES and reads "7h 1m".
 * - `unit` — value, one space, unit: "8 km".
 * - `suffix` — value glued to its symbol: "97%", which is how a percentage is written in English.
 * - `bare` — a number that genuinely has no unit. Inventing one would be a claim.
 */
export type ValueFormat =
  | { readonly kind: 'bare' }
  | { readonly kind: 'duration' }
  | { readonly kind: 'suffix'; readonly suffix: string }
  | { readonly kind: 'unit'; readonly unit: string };

export const VALUE_FORMATS: Readonly<Record<MetricKey, ValueFormat>> = {
  bioAge: { kind: 'unit', unit: 'years' },
  calories: { kind: 'unit', unit: 'kcal' },
  carbs: { kind: 'unit', unit: 'g' },
  distance: { kind: 'unit', unit: 'km' },
  fat: { kind: 'unit', unit: 'g' },
  fibre: { kind: 'unit', unit: 'g' },
  protein: { kind: 'unit', unit: 'g' },
  sessions: { kind: 'bare' },
  sleep: { kind: 'duration' },
  training: { kind: 'duration' },
  weight: { kind: 'unit', unit: 'kg' },
};

/**
 * How a DIFFERENCE is written, which is not always how the value is.
 *
 * Legacy's split, kept deliberately: a duration VALUE reads "7h 1m" because that is how a night is
 * spoken, and a duration DIFFERENCE reads "22 min", because "22m more than last week" invites the
 * eye to read a lone `m` as metres — and because a difference is a size rather than a clock reading.
 */
const DELTA_FORMATS: Readonly<Record<MetricKey, ValueFormat>> = {
  ...VALUE_FORMATS,
  sleep: { kind: 'unit', unit: 'min' },
  training: { kind: 'unit', unit: 'min' },
};

/**
 * THE definition of a duration for the eye: "7h 1m", or "48m" under an hour. Takes MINUTES.
 *
 * Negative input is clamped rather than printed. There is no such thing as a night of minus twenty
 * minutes, and "-1h -20m" is the kind of text that reaches somebody only because nobody clamped.
 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes)) return '';
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

/**
 * THE same duration for PROSE: "7 h 32 min", "1 h", "45 min".
 *
 * For a sentence, where "7h 32m" reads like a dashboard. One function rather than three, because
 * three identical copies is exactly how Legacy's defect started.
 *
 * **Rounds the total before splitting.** The copies this replaced rounded the two halves
 * independently, so `419.7` came out as "6 h 60 min" — a real carry bug on a shipped surface. There
 * is a test for that number specifically.
 */
export function formatDurationLong(minutes: number): string {
  if (!Number.isFinite(minutes)) return '';
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

function apply(format: ValueFormat, value: number): string {
  switch (format.kind) {
    case 'bare':
      return `${round(value)}`;
    case 'duration':
      return formatDuration(value);
    case 'suffix':
      return `${round(value)}${format.suffix}`;
    case 'unit':
      return `${round(value)} ${format.unit}`;
  }
}

/**
 * One decimal where it carries meaning, none where it does not.
 *
 * 8.2 km is a run; "8 km" throws away something the person measured. 412.6 kcal is false precision
 * on an estimate nobody weighed. The rule is the magnitude, not the metric: under a hundred, one
 * decimal if there is one; above it, whole numbers.
 */
function round(value: number): string {
  if (Math.abs(value) >= 100) return String(Math.round(value));
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** A value as the screen prints it. Null when there is no number — never "NaN", never a silent 0. */
export function formatValue(key: MetricKey, value: number): string | null {
  if (!Number.isFinite(value)) return null;
  return apply(VALUE_FORMATS[key], value);
}

/** A difference, signed. Null when there is no number. */
export function formatDelta(key: MetricKey, value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${apply(DELTA_FORMATS[key], Math.abs(value))}`;
}

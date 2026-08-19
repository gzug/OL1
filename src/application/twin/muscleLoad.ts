/**
 * Which muscles have been worked lately, from the sessions that were actually logged.
 *
 * Pure — no store, no clock of its own — so every rule below can be asserted in bare Node. The
 * honesty of this file is the whole feature: the figure says nothing the sessions do not support.
 *
 * **Colour means WORKED RECENTLY, never "needs rest."** The owner chose that on 2026-08-19 when the
 * difference was put to him: "your calves took the most load this week" is a reading, and "your
 * calves need rest" is advice a colour cannot caveat. Advice belongs to the coach, in words.
 *
 * Three rules follow from that, and each one is a refusal:
 *
 * 1. **A session type nobody has mapped contributes nothing**, and is counted so the screen can say
 *    so. Spreading an unknown session over "probably the legs" would be inventing the reading.
 * 2. **Load fades with time rather than accumulating.** A run seven days ago is not a warm muscle.
 * 3. **The scale tops out.** Three steps, and the third means "most of what you did", not "danger".
 *    A scale that keeps escalating turns a busy week into a warning nobody asked for.
 */

/** The muscle names the figure knows. These are `react-native-body-highlighter`'s own slugs. */
export type MuscleSlug =
  | 'abs'
  | 'adductors'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'deltoids'
  | 'forearm'
  | 'gluteal'
  | 'hamstring'
  | 'lower-back'
  | 'obliques'
  | 'quadriceps'
  | 'tibialis'
  | 'trapezius'
  | 'triceps'
  | 'upper-back';

/**
 * What a kind of session reaches, and how strongly.
 *
 * Deliberately coarse. A run works far more than four muscles, but these are the ones a person
 * would name if asked, and a longer list of small numbers reads as precision this has no way to
 * earn. Weights are relative within a session, not a share of anything.
 *
 * Legacy's `exerciseTypeLabels.ts` maps Health Connect's ~90 numeric codes to names; when the phone
 * lands, that map feeds this one. The names here are already its vocabulary for that reason.
 */
export const SESSION_MUSCLES: Readonly<Record<string, Readonly<Partial<Record<MuscleSlug, number>>>>> = {
  cycling: { calves: 0.5, gluteal: 0.6, quadriceps: 1, tibialis: 0.3 },
  golf: { obliques: 0.7, 'lower-back': 0.5, forearm: 0.5, trapezius: 0.4 },
  gym: { biceps: 0.6, chest: 0.8, deltoids: 0.8, triceps: 0.6, 'upper-back': 0.8 },
  hiking: { calves: 0.8, gluteal: 0.6, hamstring: 0.5, quadriceps: 0.8 },
  running: { calves: 1, gluteal: 0.6, hamstring: 0.7, quadriceps: 0.8, tibialis: 0.5 },
  swimming: { chest: 0.6, deltoids: 1, triceps: 0.6, 'upper-back': 0.9 },
  walking: { calves: 0.5, quadriceps: 0.4 },
};

/** How long a session keeps showing on the figure. A week, because that is the window he asked in. */
export const WINDOW_DAYS = 7;

export type LoggedSession = {
  /** ISO. When the session happened. */
  readonly at: string;
  /** 'running', 'gym', … or the muscles named outright when the person tapped them. */
  readonly kind: string;
  /** Set when the person marked muscles by hand. Overrides `kind` — they know and we do not. */
  readonly muscles?: readonly MuscleSlug[];
};

/** 1, 2 or 3 — the index of a colour on the scale. Absent from the map means untouched. */
export type Intensity = 1 | 2 | 3;

/**
 * How much a session still counts, `days` after it happened. Linear to zero across the window, so a
 * session on the edge of it fades out rather than dropping off a cliff.
 */
export function freshness(days: number): number {
  if (days < 0 || days >= WINDOW_DAYS) return 0;
  return 1 - days / WINDOW_DAYS;
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Number.isFinite(ms) ? ms / 86_400_000 : Number.POSITIVE_INFINITY;
}

export type MuscleLoad = {
  /** What to draw. Only muscles with something behind them appear. */
  readonly loads: Readonly<Partial<Record<MuscleSlug, Intensity>>>;
  /** Sessions inside the window whose kind nobody has mapped. Said out loud, never absorbed. */
  readonly unplaced: number;
  /** Sessions that counted. Zero means the figure is honestly blank. */
  readonly counted: number;
};

export function muscleLoad(sessions: readonly LoggedSession[], now: string): MuscleLoad {
  const totals = new Map<MuscleSlug, number>();
  let unplaced = 0;
  let counted = 0;

  for (const session of sessions) {
    const weight = freshness(daysBetween(session.at, now));
    if (weight === 0) continue;

    // Hand-marked muscles win. The person tapped them; nothing here knows better.
    const reached: Readonly<Partial<Record<MuscleSlug, number>>> =
      session.muscles !== undefined && session.muscles.length > 0
        ? Object.fromEntries(session.muscles.map((slug) => [slug, 1]))
        : (SESSION_MUSCLES[session.kind] ?? {});

    const entries = Object.entries(reached) as [MuscleSlug, number][];
    if (entries.length === 0) {
      unplaced += 1;
      continue;
    }

    counted += 1;
    for (const [slug, share] of entries) {
      totals.set(slug, (totals.get(slug) ?? 0) + share * weight);
    }
  }

  /**
   * The scale is relative to the busiest muscle, not to an absolute number of sessions.
   *
   * Absolute thresholds would mean someone who trains twice a week never sees a warm colour, and
   * someone who trains daily sees everything at the top — in both cases the figure stops saying
   * anything. Relative keeps it a reading of THIS week: what you worked most, and what you worked
   * less. The caption on screen has to say that, or the colour overstates itself.
   */
  const peak = Math.max(...totals.values(), 0);
  const loads: Partial<Record<MuscleSlug, Intensity>> = {};

  for (const [slug, total] of totals) {
    const share = total / peak;
    loads[slug] = share > 0.66 ? 3 : share > 0.33 ? 2 : 1;
  }

  return { counted, loads, unplaced };
}

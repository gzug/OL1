/**
 * What each domain is contributing to the twin, and what it may honestly say about it.
 *
 * Pure, and separate from the hook that loads it, for the reason this repository keeps repeating: a
 * judgement made inside a component is a judgement nothing can assert in bare Node. `bioAge.ts` is
 * the same split for the number above these cards.
 *
 * **The line this file exists to keep**, from `docs/product-spec.md`, settled 2026-08-03:
 *
 * > One twin, fed by every domain, is the claim the orbit exists to make.
 *
 * Home draws every hub connected to the centre. Until now, opening the centre proved nothing: every
 * domain computes something about the person and every one of those things was shown on its own hub
 * screen and nowhere else. These are those readings, arriving where the claim is made.
 *
 * **A domain that knows nothing says so, and that is the most useful line on the screen.** Sleep and
 * Resilience compute nothing and cannot until a phone and a wearable exist. Hiding them would make
 * the twin look complete; naming them is what shows a person what it is still missing. It is also
 * the difference between an empty domain and a broken one, which is `docs/decisions/0013` again.
 */

import { buildHeatmap, minutesByDate, type Heatmap } from '@/application/exercise/heatmap';
import { weekOfEntries } from '@/application/hubs/weekly';
import { agoWords, panelRecency } from '@/application/labs/panelRecency';
import type { HubEntry } from '@/core/hubs';

/**
 * Why a domain has nothing to say. Never merely "no data" — the reason is the useful half.
 *
 * `nothingLogged` is the person's own doing and is fixable by them. `notBuilt` is ours, and telling
 * somebody to log their sleep in an app that cannot read sleep would be blaming them for our gap.
 */
export type Silence = 'nothingLogged' | 'notBuilt';

export type DomainSummary = {
  readonly hubId: string;
  readonly label: string;
} & (
  | {
      /** A supporting line, where there is one worth reading. */
      readonly detail: string | null;
      /** The one thing this domain currently knows, in the fewest words that are true. */
      readonly headline: string;
      readonly said: 'something';
      /** Twelve weeks of sessions, for the one domain that has a shape worth drawing. */
      readonly strip: Heatmap | null;
    }
  | { readonly said: 'nothing'; readonly why: Silence }
);

/** What a domain is waiting for, in words that name the cause rather than the absence. */
export const SILENCE_WORDS: Readonly<Record<Silence, string>> = {
  nothingLogged: 'Nothing logged here yet',
  notBuilt: 'Nothing yet — One L1fe cannot read this',
};

/* ── Health record ─────────────────────────────────────────────────────────────────────────── */

/**
 * How old the blood is, and nothing about the number it produced.
 *
 * **The biological age deliberately does not appear here.** It leads the whole screen, directly
 * under the body, because the spec says the drift number leads the Twin. Repeating it in a card
 * three centimetres below would be the same claim twice, and the two would drift apart the first
 * time one of them changed.
 */
export function healthSummary(entries: readonly HubEntry[], now: string): DomainSummary {
  const panels = entries.filter((entry) => entry.kind === 'panel');
  const recency = panelRecency(panels, now);

  if (recency.status === 'none') {
    return { hubId: 'medical', label: 'Health record', said: 'nothing', why: 'nothingLogged' };
  }

  const others = entries.filter((entry) => entry.kind !== 'panel').length;

  return {
    detail: others === 0 ? null : `${others} ${others === 1 ? 'other note' : 'other notes'}`,
    headline: `Blood drawn ${agoWords(recency.monthsAgo)}`,
    hubId: 'medical',
    label: 'Health record',
    said: 'something',
    strip: null,
  };
}

/* ── Exercise ──────────────────────────────────────────────────────────────────────────────── */

/** The Exercise hub's own window. Two different windows would be two different readings. */
const TWELVE_WEEKS = 12;

/**
 * Sessions, this week and over twelve.
 *
 * **The strip is the reason this card is not a sentence.** Twelve weeks of training has a shape, and
 * the shape is the reading — one busy month beside two quiet ones says something no count does.
 *
 * `weeklyClaimAllowed` is read rather than ignored: four separate days is the floor for saying
 * anything about "this week", and below it the card talks about the window instead of the week.
 */
export function exerciseSummary(entries: readonly HubEntry[], now: string): DomainSummary {
  const sessions = entries.filter((entry) => entry.kind === 'session');

  if (sessions.length === 0) {
    return { hubId: 'exercise', label: 'Exercise', said: 'nothing', why: 'nothingLogged' };
  }

  const week = weekOfEntries(sessions, 'session', now);
  /* The same three calls the Exercise hub makes, in the same order — one bucketing of a day, not a
     second one that could disagree with the grid a tap away. */
  const heatmap = buildHeatmap(minutesByDate(sessions), TWELVE_WEEKS, now.slice(0, 10));

  return {
    detail: heatmap.hasData ? 'Twelve weeks' : null,
    headline: week.weeklyClaimAllowed
      ? `${week.total} ${week.total === 1 ? 'session' : 'sessions'} this week`
      : `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'} recorded`,
    hubId: 'exercise',
    label: 'Exercise',
    said: 'something',
    strip: heatmap.hasData ? heatmap : null,
  };
}

/* ── Nutrition ─────────────────────────────────────────────────────────────────────────────── */

/**
 * The last weigh-in, and how much was logged.
 *
 * **The weekly nutrition score is deliberately not here.** It needs macros on the meals, most meals
 * do not carry them, and a score computed from three of twelve meals is a number that looks like a
 * judgement of a week it did not see. It belongs on the Nutrition hub, where the meals it is drawn
 * from are visible directly underneath.
 */
export function nutritionSummary(entries: readonly HubEntry[], now: string): DomainSummary {
  const weights = entries
    .filter((entry) => entry.kind === 'weight' && typeof entry.payload.kg === 'number')
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const meals = entries.filter((entry) => entry.kind === 'meal');

  if (weights.length === 0 && meals.length === 0) {
    return { hubId: 'nutrition', label: 'Nutrition', said: 'nothing', why: 'nothingLogged' };
  }

  const week = weekOfEntries(meals, 'meal', now);
  const latest = weights[0];

  return {
    detail:
      meals.length === 0
        ? null
        : `${week.total} ${week.total === 1 ? 'meal' : 'meals'} this week`,
    headline:
      latest === undefined
        ? `${meals.length} ${meals.length === 1 ? 'meal' : 'meals'} logged`
        : `${latest.payload.kg as number} kg`,
    hubId: 'nutrition',
    label: 'Nutrition',
    said: 'something',
    strip: null,
  };
}

/* ── The two that cannot speak yet ─────────────────────────────────────────────────────────── */

/**
 * Sleep and Resilience, which compute nothing and say why.
 *
 * Neither is waiting on the person. Sleep needs Health Connect on a phone that does not exist yet,
 * and Resilience needs heart-rate variability from a wearable nothing can read. `notBuilt` rather
 * than `nothingLogged` is the whole difference: one asks somebody to do something, and the other
 * admits we have not.
 */
export function unbuiltSummaries(): readonly DomainSummary[] {
  return [
    { hubId: 'sleep', label: 'Sleep', said: 'nothing', why: 'notBuilt' },
    { hubId: 'resilience', label: 'Resilience', said: 'nothing', why: 'notBuilt' },
  ];
}

/* ── All of it ─────────────────────────────────────────────────────────────────────────────── */

export type EntriesByHub = Readonly<Record<string, readonly HubEntry[]>>;

/**
 * Every domain, in the order the twin reads them.
 *
 * Health record first because the number it produces leads the screen and this is its provenance;
 * then the two domains a person can feed today; then the two that cannot be fed at all.
 *
 * **Hidden hubs are left out.** Putting a hub away is a statement about what somebody wants to see,
 * and it would be a strange app that honoured that on the ring and ignored it here.
 */
export function domainSummaries(
  entries: EntriesByHub,
  hidden: readonly string[],
  now: string,
): readonly DomainSummary[] {
  const away = new Set(hidden);

  return [
    healthSummary(entries.medical ?? [], now),
    exerciseSummary(entries.exercise ?? [], now),
    nutritionSummary(entries.nutrition ?? [], now),
    ...unbuiltSummaries(),
  ].filter((summary) => !away.has(summary.hubId));
}

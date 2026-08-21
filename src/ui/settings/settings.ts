/**
 * The judgements the settings screens make about stored data. No React, no copy.
 *
 * Copy and the index model live in `rows.ts`; this is the arithmetic underneath them. Both are pure
 * for the reason this repository keeps repeating: a judgement made inside a component is a
 * judgement nothing can assert in bare Node.
 */

import { sportCoachesFor, type NamedSport } from '@/application/exercise/sportCoaches';
import type { HubEntry } from '@/core/hubs';
import type { Profile, Sex } from '@/core/profile';
import { childHubs, orbitHubs, type HubDefinition } from '@/ui/hubs/catalog';
import { GOALS, SPORTS } from '@/ui/onboarding/firstRun';

/** Every hub's entries, keyed by hub id. What one read of the store hands this file. */
export type EntriesByHub = Readonly<Record<string, readonly HubEntry[]>>;

/**
 * Three states, never two.
 *
 * `unknown` is what a screen holds before its first read; `failed` is what it holds after one that
 * did not work. Collapsed into one, either the screen sits silently empty when the store is broken —
 * no reason given, indistinguishable from a slow read — or it prints *could not read* for the
 * half-second before the first read lands, which is a false claim about the app rather than about
 * the person. `bioAge.ts` splits `unknown` from `waiting` for the same reason.
 */
export type Loaded<T> =
  | { readonly status: 'failed' }
  | { readonly status: 'ready'; readonly value: T }
  | { readonly status: 'unknown' };

export const UNKNOWN = { status: 'unknown' } as const;
export const FAILED = { status: 'failed' } as const;

export function ready<T>(value: T): Loaded<T> {
  return { status: 'ready', value };
}

/* ── About you ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Which sex is shown as chosen, and `null` for none of them.
 *
 * **A default is not an answer.** This returned `preferNotToSay` for a person with no profile at
 * all, which is exactly right to STORE for an unanswered question and exactly wrong to SHOW: a
 * highlighted pill reads as a choice already made on behalf of somebody who has not made one. It
 * shipped that way and was caught by opening the deployed screen. A profile that EXISTS and says
 * `preferNotToSay` is different — skipping is an answer, and it stays chosen.
 */
export function shownSex(profile: Profile | null): Sex | null {
  return profile === null ? null : profile.sex;
}

/* ── Goals ─────────────────────────────────────────────────────────────────────────────────── */

export type GoalChoice = {
  readonly held: boolean;
  /** Where it is recorded: one of the seven lands in the hub that covers it, yours in its own. */
  readonly hubId: string;
  readonly label: string;
  readonly own: boolean;
};

/**
 * What a goal entry says, defensively.
 *
 * A missing `held` means held: every goal the first run has ever written omits it, and reading the
 * absence as "dropped" would silently empty this screen for anybody who onboarded before today.
 */
function goalIn(entry: HubEntry): { held: boolean; label: string } | null {
  if (entry.kind !== 'goal') return null;
  const label = entry.payload.label;
  if (typeof label !== 'string' || label.trim().length === 0) return null;
  return { held: entry.payload.held !== false, label: label.trim() };
}

/**
 * The payload a change writes. **Nothing here deletes** — dropping a goal is recorded rather than
 * erased, which is the owner's decision of 2026-08-21 applied to an answer instead of a hub.
 *
 * The row it lands on carries a stable `answerId`, so changing your mind replaces rather than
 * appends. See `answerId` in `entryWords.ts`, and the note on `hubs.add`.
 */
export function goalPayload(label: string, held: boolean): Readonly<Record<string, unknown>> {
  return held ? { label } : { held: false, label };
}

/**
 * Every goal there is: the seven that ship, plus every one somebody typed.
 *
 * Read back from the store rather than listed, which is the owner's question of 2026-08-21 — *what
 * if I write a goal and then it is not picked up here?* A typed goal made its own hub and wrote a
 * goal entry inside it, so reading every hub's goal entries is what puts his own answers in the same
 * list as ours.
 *
 * Newest wins per label, so three taps leave one answer on screen whatever order a store returns.
 */
export function goalsFrom(entriesByHub: EntriesByHub): readonly GoalChoice[] {
  const latest = new Map<string, { held: boolean; hubId: string; namedAt: string }>();

  const all = Object.entries(entriesByHub)
    .flatMap(([hubId, entries]) => entries.map((entry) => ({ entry, hubId })))
    .sort((a, b) => a.entry.recordedAt.localeCompare(b.entry.recordedAt));

  for (const { entry, hubId } of all) {
    const goal = goalIn(entry);
    if (goal === null) continue;
    const first = latest.get(goal.label)?.namedAt ?? entry.recordedAt;
    latest.set(goal.label, { held: goal.held, hubId, namedAt: first });
  }

  const shipped = GOALS.filter((goal) => goal.hubId !== undefined).map((goal) => ({
    held: latest.get(goal.label)?.held ?? false,
    hubId: latest.get(goal.label)?.hubId ?? (goal.hubId as string),
    label: goal.label,
    own: false,
  }));

  const known = new Set(shipped.map((goal) => goal.label));
  const own = [...latest.entries()]
    .filter(([label]) => !known.has(label))
    .sort((a, b) => a[1].namedAt.localeCompare(b[1].namedAt))
    .map(([label, found]) => ({ held: found.held, hubId: found.hubId, label, own: true }));

  return [...shipped, ...own];
}

/** The goals somebody actually holds, in the order they first named them. */
export function goalsHeld(entriesByHub: EntriesByHub): readonly GoalChoice[] {
  return goalsFrom(entriesByHub).filter((goal) => goal.held);
}

/* ── Training ──────────────────────────────────────────────────────────────────────────────── */

export type SportChoice = {
  readonly coachId: string;
  readonly label: string;
  readonly named: boolean;
};

/**
 * The sports, and which of them somebody has named.
 *
 * A sport is a voice, not a room — `docs/decisions/0014`. `sportCoachesFor` is the one reader of
 * those entries and this calls it rather than re-deriving, so the conversation drawer and this
 * screen cannot disagree about which coaches exist.
 */
export function sportsFrom(exerciseEntries: readonly HubEntry[]): readonly SportChoice[] {
  const named = new Map(sportCoachesFor(exerciseEntries).map((sport) => [sport.coachId, sport]));

  const shipped = SPORTS.map((sport) => ({
    coachId: sport.coachId,
    label: sport.label,
    named: named.has(sport.coachId),
  }));

  const ours = new Set(shipped.map((sport) => sport.coachId));
  const own = [...named.values()]
    .filter((sport: NamedSport) => !ours.has(sport.coachId))
    .map((sport) => ({ coachId: sport.coachId, label: sport.label, named: true }));

  return [...shipped, ...own];
}

/** What naming a sport writes. The same row `FirstRunFlow.commitTraining` writes. */
export function sportPayload(sport: SportChoice): Readonly<Record<string, unknown>> {
  return { coachId: sport.coachId, label: sport.label };
}

/* ── Hubs ──────────────────────────────────────────────────────────────────────────────────── */

export type HubRow = {
  readonly away: boolean;
  /** 0 for a place on the ring, 1 for a hub that lives inside one. */
  readonly depth: number;
  readonly hub: HubDefinition;
};

/**
 * Every hub as one list: ring order, with anything nested shown under its parent.
 *
 * The owner chose one list on 2026-08-21. Hidden hubs stay in place rather than moving to a block of
 * their own — a hub you put away has not left the app, and showing it where it belongs with a way
 * back says that better than a bin at the bottom.
 */
export function hubRows(
  hubs: readonly HubDefinition[],
  hidden: readonly string[],
): readonly HubRow[] {
  const away = new Set(hidden);

  return orbitHubs(hubs).flatMap((hub) => [
    { away: away.has(hub.id), depth: 0, hub },
    ...childHubs(hub.id, hubs).map((child) => ({
      away: away.has(child.id),
      depth: 1,
      hub: child,
    })),
  ]);
}

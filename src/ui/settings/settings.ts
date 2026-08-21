/**
 * Everything the settings screen decides, with no React in it.
 *
 * Split from the screen for the reason this repository keeps repeating: a judgement made inside a
 * component is a judgement nothing can assert in bare Node. `firstRun.ts` is the closest relative
 * and the model for this file, down to holding the copy — a sentence that makes a claim about
 * somebody's data is a decision rather than decoration, and rendering it as `{COPY.x}` keeps every
 * apostrophe out of the lint rule that rejects a straight quote in a JSX text node.
 *
 * **The screen this serves is the first run asked again.** Onboarding asks once and there was
 * nowhere to change an answer; every question here is one `firstRun.ts` already asks, and its
 * `GOALS`, `SPORTS` and `COPY` are imported rather than re-typed. A second copy of that vocabulary
 * is how two screens come to disagree about what a person was asked.
 */

import { sportCoachesFor, type NamedSport } from '@/application/exercise/sportCoaches';
import type { HubEntry } from '@/core/hubs';
import { childHubs, orbitHubs, type HubDefinition } from '@/ui/hubs/catalog';
import { kindWords } from '@/ui/hubs/entryWords';
import { GOALS, SPORTS } from '@/ui/onboarding/firstRun';

/** Every hub's entries, keyed by hub id. What one read of the store hands this file. */
export type EntriesByHub = Readonly<Record<string, readonly HubEntry[]>>;

/**
 * Three states, never two.
 *
 * `unknown` is what the screen holds before its first read. It exists because
 * `docs/decisions/0013` shape 1 is the cheapest mistake to make here: an unticked chip is a claim
 * that a person does not hold that goal, and rendering one from a store that has not answered yet
 * tells them something about themselves that nothing has looked up.
 *
 * **`failed` is separate from `unknown`, and the separation earns its keep.** Collapsed into one,
 * either the screen sits silently empty when the store is broken — no reason given, indistinguishable
 * from a slow read — or it prints *could not read* for the half-second before the first read lands,
 * which is a false claim about the app rather than about the person. `bioAge.ts` splits `unknown`
 * from `waiting` for the same reason.
 */
export type Loaded<T> =
  | { readonly status: 'failed' }
  | { readonly status: 'ready'; readonly value: T }
  | { readonly status: 'unknown' };

/** Nothing has been looked up yet. Says nothing, shows nothing. */
export const UNKNOWN = { status: 'unknown' } as const;

/** The lookup happened and did not work. Says so, about the app, and shows nothing else. */
export const FAILED = { status: 'failed' } as const;

export function ready<T>(value: T): Loaded<T> {
  return { status: 'ready', value };
}

/* ── Goals ─────────────────────────────────────────────────────────────────────────────────── */

export type GoalChoice = {
  /** Whether this is a goal right now. Derived; see `goalsFrom`. */
  readonly held: boolean;
  /** Where it is recorded. One of the seven lands in the hub that covers it; yours lands in its own. */
  readonly hubId: string;
  readonly label: string;
  /** True for a goal somebody typed, false for one of the seven that ship. */
  readonly own: boolean;
};

/**
 * What a goal entry says, defensively.
 *
 * A `hub_entry` payload is JSON out of a database, so its shape is a claim rather than a guarantee.
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
 * The payload a tap writes.
 *
 * **Turning a goal off writes; it does not delete.** Nothing in OL1 deletes — the owner chose
 * hideable over deletable on 2026-08-21 and the same reasoning holds for an answer as for a hub.
 * So dropping a goal is recorded as its own event and `goalsFrom` reads the newest one back.
 *
 * Turning one ON writes exactly what `FirstRunFlow.commitGoals` writes, byte for byte. The two
 * screens must produce the same row or the first run and this screen mean different things by the
 * same word.
 */
export function goalPayload(label: string, held: boolean): Readonly<Record<string, unknown>> {
  return held ? { label } : { held: false, label };
}

/**
 * Every goal there is: the seven that ship, plus every one somebody typed.
 *
 * **Read back from the store rather than listed here**, which is the owner's question of
 * 2026-08-21 — *what if I write a goal and then it is not picked up here?* A typed goal made its own
 * hub and wrote a `goal` entry inside it, so reading every hub's goal entries is what puts his own
 * answers in the same list as ours. A fixed list of seven would have shown him someone else's idea
 * of what he wants.
 *
 * **Newest wins per label.** Toggling has to CONVERGE rather than accumulate: three taps leave three
 * rows in the store and one answer on the screen. Entries are sorted ascending here and the last
 * sighting overwrites, so the arithmetic does not depend on which order a store hands them back.
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

/* ── Training ──────────────────────────────────────────────────────────────────────────────── */

export type SportChoice = {
  readonly coachId: string;
  readonly label: string;
  /** Whether this sport has been named, and so whether its coach exists. */
  readonly named: boolean;
};

/**
 * The sports, and which of them somebody has named.
 *
 * **A sport is a voice, not a room** — `docs/decisions/0014`, which landed while this screen was
 * being designed. Naming one writes an entry of kind `sport` on Exercise carrying its coach id, and
 * `sportCoachesFor` in the application layer is the one reader of that. This calls it rather than
 * re-deriving, so the drawer that lists sport coaches and this screen cannot disagree about which
 * ones exist.
 *
 * **Naming is add-only here, and that is a limit rather than a choice.** `sportCoachesFor` keeps
 * the FIRST entry per coach, so an un-naming written after it would be read straight past and the
 * drawer would go on offering a coach somebody had just turned off — worse than not offering the
 * switch. Turning a sport off needs that reader to change, and it belongs to a live session. It is
 * written up rather than half-built.
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

/**
 * What naming a sport writes. The same row `FirstRunFlow.commitTraining` writes.
 *
 * Only ever called for a sport that is not already named — a second identical row would be
 * deduplicated by `sportCoachesFor` and still counted by every screen that counts entries, so the
 * store would grow a row that nothing reads and one screen miscounts.
 */
export function sportPayload(sport: SportChoice): Readonly<Record<string, unknown>> {
  return { coachId: sport.coachId, label: sport.label };
}

/* ── Hubs ──────────────────────────────────────────────────────────────────────────────────── */

export type HubRow = {
  /** Put away. Still on this list, because this list is the way back. */
  readonly away: boolean;
  /** 0 for a place on the ring, 1 for a hub that lives inside one. */
  readonly depth: number;
  readonly hub: HubDefinition;
};

/**
 * Every hub, as one list: ring order, with anything nested shown under its parent.
 *
 * The owner chose one list over a training section and a hub section, 2026-08-21. Hidden hubs stay
 * in place rather than moving to a block of their own — a hub you put away has not left the app,
 * and showing it where it belongs with a way back says that better than a bin at the bottom.
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

/* ── What is stored ────────────────────────────────────────────────────────────────────────── */

export type Tally = { readonly count: number; readonly kind: string };

/**
 * Everything written down, counted by kind.
 *
 * Counted across every hub rather than sampled, and never capped by a display limit —
 * `StoredEntries` shipped that bug once, saying "5 meals" to somebody with six because it counted
 * what it had fetched to show.
 */
export function tally(entriesByHub: EntriesByHub): readonly Tally[] {
  const byKind = new Map<string, number>();

  for (const entries of Object.values(entriesByHub)) {
    for (const entry of entries) byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
  }

  return [...byKind.entries()]
    .map(([kind, count]) => ({ count, kind }))
    .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));
}

/**
 * The count as a sentence, in the words every other screen uses.
 *
 * `kindWords` rather than a second vocabulary: two copies of "meal / meals" is how one screen comes
 * to call something a `weight` and another a weigh-in.
 */
export function tallyLine(counts: readonly Tally[]): string {
  return counts.map((entry) => `${entry.count} ${kindWords(entry.kind, entry.count)}`).join(' · ');
}

/* ── Copy ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * Every sentence on this screen.
 *
 * Two of them make claims and are asserted in `tests/settings.test.ts`: `storedNote`, which says
 * what the count above it is a count OF, and `unread`, which has to be a statement about the app
 * rather than about the person. The rest are labels.
 *
 * **`storedNote` is the one worth reading twice.** Dropping a goal writes a row, so a person who
 * set a goal and dropped it has two goal rows and one goal. The count is a count of what is
 * written down, and the sentence says so rather than letting the number imply something tidier.
 */
export const COPY = {
  aboutHint:
    'The year is what a biological age is worked out against — without it there is no number at all. Everything here saves as you change it.',
  aboutTitle: 'ABOUT YOU',
  addHub: 'Add a hub of your own',
  ageSuffix: 'years old',
  briefsHint: 'In your own words. The same box that is on the hub itself.',
  briefsTitle: 'HOW EACH COACH WORKS',
  bringBack: 'Bring back',
  goalsHint: 'Tap to turn one on or off. Each one lands in the part of the app that covers it.',
  goalsTitle: 'WHAT YOU WANT',
  hubsHint: 'What is on your ring. Putting one away keeps everything in it.',
  hubsTitle: 'YOUR HUBS',
  intro: 'The questions the first run asks, and your answers as they stand.',
  keepIt: 'Keep it',
  noBrief: 'Tell it how to work with you',
  onTheRing: 'On the ring',
  putAway: 'Put away',
  putAwayNote: 'Everything logged in a hub you put away is still here, exactly as it was.',
  replay: 'Show the first run again',
  replayHint: 'It walks through the same questions. Nothing is cleared and nothing is removed.',
  replayTitle: 'THE FIRST RUN',
  saveFailed: 'That did not save, so nothing changed. Try again.',
  storedNote:
    'Everything OL1 has written down, including answers you later changed. Nothing here is ever deleted.',
  storedTitle: 'WHAT IS STORED',
  title: 'Settings',
  trainingHint:
    'Naming one gives you its coach. Turning a sport off is not built yet, so nothing here pretends to.',
  trainingNamed: 'NAMED',
  trainingTitle: 'WHAT YOU TRAIN',
  unread: 'OL1 could not read that. Nothing is lost — try opening this screen again.',
} as const;

/**
 * Which sport coaches a person has.
 *
 * **The owner's decision, 2026-08-21: sports are coaches, not hubs.** Running, Gym, Cycling,
 * Swimming and Golf used to ship as hubs inside Exercise and were never anything but empty rooms —
 * every session goes to `exercise` with the sport as a field on the payload, and a sport hub had
 * received none. What naming a sport earns you is its voice.
 *
 * So "do I have a Golf Coach" is answered by an entry on Exercise, not by a hub existing. This is
 * the reader for the drawer's *Sport coaches* section.
 *
 * Pure: entries in, coach ids out.
 */

import type { HubEntry } from '@/core/hubs';

/** The hub every session and every named sport belongs to. */
export const SPORT_HUB = 'exercise';

export type NamedSport = {
  readonly coachId: string;
  readonly label: string;
};

function named(payload: Readonly<Record<string, unknown>>): NamedSport | null {
  const coachId = payload.coachId;
  const label = payload.label;
  if (typeof coachId !== 'string' || coachId.length === 0) return null;
  return { coachId, label: typeof label === 'string' && label.length > 0 ? label : coachId };
}

/**
 * The sports a person named, in the order they named them, without repeats.
 *
 * **Deduplicated by coach**, because naming a sport twice is the shape a settings screen produces
 * when somebody re-saves their answers. Two Golf Coaches in a drawer is the kind of thing nobody
 * reports and everybody notices.
 */
export function sportCoachesFor(entries: readonly HubEntry[]): readonly NamedSport[] {
  const found: NamedSport[] = [];
  const seen = new Set<string>();

  for (const entry of [...entries].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
    if (entry.kind !== 'sport') continue;

    const sport = named(entry.payload);
    if (sport === null || seen.has(sport.coachId)) continue;

    seen.add(sport.coachId);
    found.push(sport);
  }

  return found;
}

/**
 * The sports somebody has actually LOGGED, whether or not they named them.
 *
 * Importing years of Strava history is the case this exists for: it brings in swims from somebody
 * who never ticked Swimming, and offering them a coach for a sport they demonstrably do is better
 * than waiting to be told. Nothing here writes — a screen decides what to do with the difference.
 */
export function sportsLogged(entries: readonly HubEntry[]): readonly string[] {
  const kinds = new Set<string>();

  for (const entry of entries) {
    if (entry.kind !== 'session') continue;
    const activity = entry.payload.activity;
    if (typeof activity === 'string' && activity.length > 0 && activity !== 'other') {
      kinds.add(activity);
    }
  }

  return [...kinds].sort();
}

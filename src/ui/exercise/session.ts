/**
 * A training session, and the checks around it.
 *
 * Nothing here is ported: Legacy's `activityManualLogStore` writes into its own health-observation
 * table and carries a shape built around Health Connect's record types, which is the half this does
 * not have yet. What IS taken from it is the posture — a manual session is a first-class row, not a
 * lesser version of one the phone read.
 *
 * **The types offered are the types the body figure can place.** `application/twin/muscleLoad.ts`
 * knows which muscles a run or a gym session reaches; offering "rowing" here while the figure has
 * no idea what rowing works would produce a session that silently marks nothing. So the list is the
 * same list, plus an honest "something else" — which the figure then reports as unplaced rather
 * than guessing at. The two files are meant to be read together.
 */

/** What was done. These match `SESSION_MUSCLES`, deliberately — see the note above. */
export const SESSION_TYPES = [
  { id: 'running', label: 'Running' },
  { id: 'gym', label: 'Gym' },
  { id: 'cycling', label: 'Cycling' },
  { id: 'swimming', label: 'Swimming' },
  { id: 'walking', label: 'Walking' },
  { id: 'hiking', label: 'Hiking' },
  { id: 'golf', label: 'Golf' },
  { id: 'other', label: 'Something else' },
] as const;

export type SessionTypeId = (typeof SESSION_TYPES)[number]['id'];

/**
 * Outside these a number is a typo or a wrong unit, not a session. The same idea as Legacy's
 * clinical sanity ranges: not a target, not a judgement, just the limits of the plausible. Twelve
 * hours and 300km are both generous on purpose — an ultra is a real thing and this must not argue
 * with someone who did one.
 */
export const MINUTES = { max: 720, min: 1 } as const;
export const DISTANCE_KM = { max: 300, min: 0 } as const;

export type SessionProblem = 'distanceOutside' | 'minutesMissing' | 'minutesOutside' | 'notANumber';

export function minutesProblem(text: string): SessionProblem | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 'minutesMissing';

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return 'notANumber';
  if (value < MINUTES.min || value > MINUTES.max) return 'minutesOutside';
  return null;
}

/** Distance is optional everywhere. A gym session has none, and that is not a gap to fill. */
export function distanceProblem(text: string): SessionProblem | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return 'notANumber';
  if (value < DISTANCE_KM.min || value > DISTANCE_KM.max) return 'distanceOutside';
  return null;
}

export function problemMessage(problem: SessionProblem): string {
  switch (problem) {
    case 'distanceOutside':
      return `Outside ${DISTANCE_KM.min}–${DISTANCE_KM.max} km for one session.`;
    case 'minutesMissing':
      return 'How long it took is the one thing this needs.';
    case 'minutesOutside':
      return `Outside ${MINUTES.min}–${MINUTES.max} minutes for one session.`;
    case 'notANumber':
      return 'That is not a number.';
  }
}

/**
 * What is stored.
 *
 * Same rule as a meal and a panel: **a blank is absent, never zero.** A session with no distance did
 * not cover zero kilometres — nobody measured it, and a zero would average into "your distance is
 * falling" without anybody claiming that.
 */
export function sessionPayload(
  type: SessionTypeId,
  minutes: string,
  distanceKm: string,
  note: string,
): Readonly<Record<string, unknown>> {
  const distance = distanceKm.trim();
  const trimmedNote = note.trim();

  return {
    activity: type,
    minutes: Number(minutes.trim()),
    ...(distance.length === 0 || distanceProblem(distance) !== null
      ? {}
      : { distanceKm: Number(distance) }),
    ...(trimmedNote.length === 0 ? {} : { note: trimmedNote }),
  };
}

import { dailyId } from '@/ui/hubs/entryWords';

/**
 * A night of sleep, and the checks around it.
 *
 * **What it records is one number: how long you slept.** The fixture that stood here for months
 * also showed a bed time and a wake time, and those are deliberately not asked for yet — a form
 * that takes longer to fill than the thing it records is a thing people stop doing, and the owner's
 * brief for every flow in this app has been "a few plain questions rather than a form". The note
 * field takes anything else worth saying.
 *
 * **Hours and minutes are asked separately and stored as one number.** Nobody knows how many
 * minutes they slept; everybody knows it was about seven and a half hours. Minutes is what
 * `metric.ts` stores a duration in, so the conversion happens once, here, at the edge — the same
 * argument `levine.ts` makes about a marker's unit.
 *
 * **The range is generous on purpose.** Fifteen minutes is a real answer for a bad night and this
 * must not argue with somebody who had one. The same posture as `session.ts`'s twelve hours.
 */

export const SLEEP_MINUTES = { max: 960, min: 15 } as const;

/** Which night. Two choices rather than a date picker — people log this in the morning, or not. */
export const NIGHTS = [
  { id: 'last', label: 'Last night' },
  { id: 'before', label: 'The night before' },
] as const;

export type NightId = (typeof NIGHTS)[number]['id'];

export type NightProblem = 'missing' | 'notANumber' | 'outside';

/** Blank is allowed in either field alone. "7 hours" and "45 minutes" are both whole answers. */
function parts(hours: string, minutes: string): number | NightProblem {
  const h = hours.trim();
  const m = minutes.trim();
  if (h.length === 0 && m.length === 0) return 'missing';

  const hoursValue = h.length === 0 ? 0 : Number(h);
  const minutesValue = m.length === 0 ? 0 : Number(m);
  if (!Number.isFinite(hoursValue) || !Number.isFinite(minutesValue)) return 'notANumber';
  if (hoursValue < 0 || minutesValue < 0) return 'outside';

  return Math.round(hoursValue * 60 + minutesValue);
}

export function nightMinutes(hours: string, minutes: string): number | null {
  const value = parts(hours, minutes);
  return typeof value === 'number' && value >= SLEEP_MINUTES.min && value <= SLEEP_MINUTES.max
    ? value
    : null;
}

export function nightProblem(hours: string, minutes: string): NightProblem | null {
  const value = parts(hours, minutes);
  if (typeof value !== 'number') return value;
  return value < SLEEP_MINUTES.min || value > SLEEP_MINUTES.max ? 'outside' : null;
}

export function problemMessage(problem: NightProblem): string {
  switch (problem) {
    case 'missing':
      return 'How long you slept is the one thing this needs.';
    case 'notANumber':
      return 'That is not a number.';
    case 'outside':
      return `Outside ${SLEEP_MINUTES.min} minutes to ${SLEEP_MINUTES.max / 60} hours for one night.`;
  }
}

/**
 * The morning you woke, not the evening you went to bed.
 *
 * A night spans two dates and one of them has to be the entry's. Waking is the end of it and the
 * day the sleep belongs to, which is also how every sleep tracker files it — so "last night" logged
 * on a Monday is Monday's entry.
 */
export function nightDate(night: NightId, now: string): string {
  const back = night === 'before' ? 1 : 0;
  return new Date(new Date(now).getTime() - back * 86_400_000).toISOString().slice(0, 10);
}

/**
 * What is stored, and the id that keeps it to one a night.
 *
 * `dailyId` for the reason it exists: walking a flow twice used to weigh somebody twice. A night
 * logged again REPLACES rather than accumulates — a second answer about the same night is a
 * correction, never a second night.
 */
export function nightPayload(minutes: number, note: string): Readonly<Record<string, unknown>> {
  const trimmed = note.trim();
  return { minutes, ...(trimmed.length === 0 ? {} : { note: trimmed }) };
}

export function nightEntryId(night: NightId, now: string): string {
  return dailyId('night', 'sleep', nightDate(night, now));
}

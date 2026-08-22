import { answerId } from '@/ui/hubs/entryWords';

/**
 * A condition and a medication, as somebody types them.
 *
 * Health record is the last hub with no way in. Its buttons have said "Neither way in is built yet"
 * since the hub was named, and the two things it is for are the two things a coach most needs to
 * know before it says anything at all.
 *
 * ## What this deliberately does not do
 *
 * **No vocabulary and no autocomplete.** Offering a list of conditions would make the app the thing
 * that decides what you have. A free-text name is yours; a picked one is the app's.
 *
 * **No dose checking.** A number here is not validated against anything, because there is nothing
 * honest to validate it against — this app does not know your weight-adjusted dosing, your kidney
 * function on the day, or what your doctor said. A field that rejected "too much" would be claiming
 * all three.
 *
 * **No interaction checking, ever.** Two medications recorded here are two strings. A person may
 * reasonably assume a health app looks for interactions between them; it does not, and the screen
 * says so rather than leaving the assumption standing. `docs/decisions/0019`.
 *
 * ## What it stores
 *
 * A name, a status, and one optional detail — when a condition started, or what dose a medication
 * is. Nothing else, because nothing else has a use yet and a field nobody reads is a field somebody
 * fills in for no reason.
 */

export type RecordKind = 'condition' | 'medication';

export const STATUSES: Readonly<Record<RecordKind, readonly { id: string; label: string }[]>> = {
  condition: [
    { id: 'current', label: 'Current' },
    { id: 'past', label: 'Past' },
  ],
  medication: [
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'stopped', label: 'Stopped' },
  ],
};

/** Long enough to be a name, short enough that a paragraph goes in the note instead. */
export const NAME_LENGTH = { max: 80, min: 2 } as const;

export type RecordProblem = 'tooLong' | 'tooShort';

export function nameProblem(name: string): RecordProblem | null {
  const trimmed = name.trim();
  if (trimmed.length < NAME_LENGTH.min) return 'tooShort';
  if (trimmed.length > NAME_LENGTH.max) return 'tooLong';
  return null;
}

export function problemMessage(kind: RecordKind, problem: RecordProblem): string {
  switch (problem) {
    case 'tooLong':
      return `Longer than ${NAME_LENGTH.max} characters. The rest belongs in the note.`;
    case 'tooShort':
      return `What is the ${kind} called? Your words, not a list to pick from.`;
  }
}

export function recordPayload(
  name: string,
  status: string,
  detail: string,
  note: string,
): Readonly<Record<string, unknown>> {
  const trimmedDetail = detail.trim();
  const trimmedNote = note.trim();

  return {
    name: name.trim(),
    status,
    ...(trimmedDetail.length === 0 ? {} : { detail: trimmedDetail }),
    ...(trimmedNote.length === 0 ? {} : { note: trimmedNote }),
  };
}

/**
 * **A standing fact, not an event.**
 *
 * Typing the same condition again is a CORRECTION — somebody adding the date they forgot, or moving
 * it from current to past. An event id would accumulate, and a Health record that reported asthma
 * three times because it had been edited twice would be worse than one that reported nothing.
 *
 * `answerId` lowercases and trims, so capitalisation is not a second condition.
 */
export function recordEntryId(kind: RecordKind, name: string): string {
  return answerId(kind, 'medical', name);
}

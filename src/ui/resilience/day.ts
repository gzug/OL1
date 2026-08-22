import { dailyId } from '@/ui/hubs/entryWords';

/**
 * How a day felt, in one word.
 *
 * Resilience is the hub that waits hardest for hardware: heart-rate variability and resting heart
 * rate both need a watch, and the phone is deferred. **This is the half that needs no device** —
 * the same bet manual sleep just proved out, and the fixture has named it as a way in
 * ("Add how the day felt") since the hub was drawn.
 *
 * **A word, not a number, and this is the whole design.** On 2026-08-19 the owner reviewed Legacy's
 * capabilities and dropped its **0–100 recovery score** outright. Storing a 1-to-5 here would put
 * that number back through a side door: five integers average, and an average wants a trend, and a
 * trend wants a dial — and OL1 has exactly one score by decision (`0009`), which is about how much
 * you logged rather than how you are doing.
 *
 * So the stored value is the word itself. `docs/decisions/0017` records the refusal and what has to
 * stay true of anything built on top of this.
 *
 * The five are ordered the way a person would list them, and the app never does arithmetic on that
 * order. Nothing here ranks a day, computes a mean, or draws a line through them.
 */

export const DAY_WORDS = [
  { id: 'drained', label: 'Drained' },
  { id: 'tired', label: 'Tired' },
  { id: 'steady', label: 'Steady' },
  { id: 'fresh', label: 'Fresh' },
  { id: 'strong', label: 'Strong' },
] as const;

export type DayWordId = (typeof DAY_WORDS)[number]['id'];

export function dayWordLabel(id: string): string | null {
  return DAY_WORDS.find((word) => word.id === id)?.label ?? null;
}

/**
 * What is stored, and the id that keeps it to one a day.
 *
 * `dailyId` for the reason it exists: answering again is a CORRECTION, never a second day. Somebody
 * who opens this in the morning and again at night has had one day, and a store that appended would
 * report two — the defect that once counted one weigh-in as two.
 */
export function dayPayload(word: DayWordId, note: string): Readonly<Record<string, unknown>> {
  const trimmed = note.trim();
  return { word, ...(trimmed.length === 0 ? {} : { note: trimmed }) };
}

export function dayEntryId(now: string): string {
  return dailyId('day', 'resilience', now.slice(0, 10));
}

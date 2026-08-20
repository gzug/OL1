/**
 * Who this is, as types and a port. No implementations and no imports — same law as `chat.ts`,
 * `hubs.ts` and `attachments.ts`.
 *
 * **Deliberately small, and the line is drawn on purpose.** Legacy's `LocalProfile` carried a
 * display name, a timezone, four unit preferences, allergies, chronic diseases and supplements.
 * This carries three fields, and each one is here because a screen asks for it: a birth year,
 * without which the biological age calculation returns null; a sex, which the body figure draws;
 * and a height, which the first-run flow asks for because the owner asked it to.
 *
 * **Height is here and weight is not, and that is the useful part of the rule.** Height stops
 * changing. A weight is a measurement with a date, and a column holding one would freeze whatever
 * number was typed on the first day and never admit it had gone stale — the same failure as storing
 * an age rather than a birth year. A weigh-in is a `HubEntry` of kind `weight` in the Nutrition
 * hub, where the owner moved weigh-ins on 2026-08-19.
 *
 * That is the test for anything proposed here later: does it stop changing, and does a screen use
 * it today? Legacy's `chronicDiseases` and `allergies` fail both, and they are exactly the growth
 * that turns a profile into a medical record. If those are ever wanted they belong in the Medical
 * condition hub as entries a person chose to make, not as columns on an identity.
 *
 * **Nothing here is health data.** A birth year and a sex are the two inputs a published formula
 * takes; a height is a number somebody typed about themselves.
 */

/** Legacy's own set, unchanged: nobody has to answer this question to use the app. */
export type Sex = 'female' | 'male' | 'other' | 'preferNotToSay';

export type Profile = {
  /** Year only. A birthday is a date the app has no use for; a year is all the maths needs. */
  readonly birthYear: number | null;
  /** Centimetres, whole. Null until somebody says, and it may stay null forever. */
  readonly heightCm: number | null;
  readonly sex: Sex;
  readonly updatedAt: string;
};

export interface ProfileStore {
  read(): Promise<Profile | null>;
  write(profile: Profile): Promise<void>;
}

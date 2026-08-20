/**
 * Who this is, as types and a port. No implementations and no imports — same law as `chat.ts`,
 * `hubs.ts` and `attachments.ts`.
 *
 * **Deliberately small.** Legacy's `LocalProfile` carries a display name, a timezone, four unit
 * preferences, allergies, chronic diseases and supplements. This carries two fields, because two
 * are what something on screen currently needs: a birth year, without which the biological age
 * calculation returns null, and a sex, which the body figure draws. Everything else can be added
 * the day a screen asks for it, and asking for it before then would be a form nobody wanted to
 * fill in.
 *
 * **Nothing here is health data.** A birth year and a sex are the two inputs a published formula
 * takes. They are not a medical record and this file must not grow into one — Legacy's
 * `chronicDiseases` and `allergies` fields are exactly the growth that turns a profile into a
 * record, and if those are ever wanted they belong in the Medical condition hub as entries a person
 * chose to make, not as columns on an identity.
 */

/** Legacy's own set, unchanged: nobody has to answer this question to use the app. */
export type Sex = 'female' | 'male' | 'other' | 'preferNotToSay';

export type Profile = {
  /** Year only. A birthday is a date the app has no use for; a year is all the maths needs. */
  readonly birthYear: number | null;
  readonly sex: Sex;
  readonly updatedAt: string;
};

export interface ProfileStore {
  read(): Promise<Profile | null>;
  write(profile: Profile): Promise<void>;
}

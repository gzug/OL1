/**
 * The only thing a screen calls to know who this is.
 *
 * Screens never reach past this file — the boundary `scripts/check-boundaries.mjs` enforces. Same
 * shape as `coachChat` and `hubs` beside it.
 *
 * **Age is derived, never stored.** A stored age is wrong from the next birthday onwards, and the
 * PhenoAge calculation would quietly use the stale one for a year. A birth year is a fact that does
 * not go out of date.
 */

import type { Profile, ProfileStore, Sex } from '@/core/profile';
import { profileStore as defaultStore } from '@/infrastructure/profile/profileStore';

/**
 * Legacy's own check, ported from `data/profile/profileHelpers.ts`: a year before 1900, or within
 * five of today, is a typo rather than a person. Nothing here is a judgement about who may use the
 * app — it is the range in which a four-digit number is plausibly a birth year at all.
 */
export function plausibleBirthYear(year: number | null | undefined, today: Date): number | null {
  if (year === null || year === undefined || !Number.isFinite(year)) return null;
  const thisYear = today.getFullYear();
  if (year < 1900 || year > thisYear - 5) return null;
  return year;
}

/**
 * Age in whole years, or null.
 *
 * From the year alone, so it is right for most of the year and one year high between January and
 * the birthday. That is a deliberate trade: asking for a full date of birth to fix an off-by-one in
 * a calculation whose own confidence interval is measured in years would be collecting a more
 * identifying piece of data for no real gain.
 */
export function ageFrom(birthYear: number | null, today: Date): number | null {
  if (birthYear === null) return null;
  const age = today.getFullYear() - birthYear;
  return age > 0 && age < 130 ? age : null;
}

export type Profiles = {
  read(): Promise<Profile | null>;
  /** Returns what was written, so a caller can render it without a second read. */
  save(birthYear: number | null, sex: Sex): Promise<Profile>;
};

export function createProfiles(store: ProfileStore = defaultStore): Profiles {
  return {
    read: () => store.read(),

    async save(birthYear, sex) {
      const profile: Profile = { birthYear, sex, updatedAt: new Date().toISOString() };
      await store.write(profile);
      return profile;
    },
  };
}

export const profiles: Profiles = createProfiles();

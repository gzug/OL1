/**
 * The only thing a screen calls to know who this is.
 *
 * Screens never reach past this file — the boundary `scripts/check-boundaries.mjs` enforces. Same
 * shape as `coachChat` and `hubs` beside it.
 *
 * **Age is derived, never stored.** A stored age is wrong from the next birthday onwards, and the
 * PhenoAge calculation would quietly use the stale one for a year. A birth year is a fact that does
 * not go out of date.
 *
 * **Every write merges; none replaces.** This was a real trap rather than a nicety. `AboutYou` on
 * the Twin calls `save(birthYear, sex)` and knows nothing about a height, so a `save` that wrote a
 * whole fresh record would silently drop the height every time somebody corrected their birth year
 * two screens away. A caller may only overwrite what it actually asked about.
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
 * The same idea for a height, in centimetres.
 *
 * The range is wide on purpose — it exists to catch a unit, not to judge a body. Someone typing
 * their height in metres lands on 1.75 and someone typing millimetres lands on 1750, and both are
 * refused; every height a person actually has falls inside. Rounded, because a profile has no use
 * for a fraction of a centimetre and storing one implies a precision nobody measured.
 */
export function plausibleHeightCm(cm: number | null | undefined): number | null {
  if (cm === null || cm === undefined || !Number.isFinite(cm)) return null;
  const rounded = Math.round(cm);
  return rounded >= 50 && rounded <= 250 ? rounded : null;
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
  /** Separate from `save` because the two questions are asked on different screens. */
  saveHeight(heightCm: number | null): Promise<Profile>;
};

export function createProfiles(store: ProfileStore = defaultStore): Profiles {
  /**
   * The existing record, or the empty one. `updatedAt` is stamped by the caller that writes, not
   * here, so a read that finds nothing cannot look like a write that happened.
   */
  async function merged(changes: Partial<Omit<Profile, 'updatedAt'>>): Promise<Profile> {
    const current = await store.read();
    const profile: Profile = {
      birthYear: current?.birthYear ?? null,
      heightCm: current?.heightCm ?? null,
      sex: current?.sex ?? 'preferNotToSay',
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    await store.write(profile);
    return profile;
  }

  return {
    read: () => store.read(),
    save: (birthYear, sex) => merged({ birthYear, sex }),
    saveHeight: (heightCm) => merged({ heightCm }),
  };
}

export const profiles: Profiles = createProfiles();

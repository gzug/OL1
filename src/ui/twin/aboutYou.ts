/**
 * What the About you block may say, given what the store has answered. No React in it.
 *
 * Split out for the reason this repository keeps repeating: a judgement made inside a component is
 * a judgement nothing can assert in bare Node. `bioAge.ts` is the same split for the number below
 * this block, and the state shape here is deliberately its sibling.
 *
 * **The defect this file exists to end.** `AboutYou` held one `null` for three different things —
 * nobody has looked yet, the read failed, and there is no profile — and printed *"Add your year of
 * birth to get a biological age"* for all three. Two of those are not a fact about a person; one is
 * the absence of a lookup and the other is a database error. Shape 1 of `docs/decisions/0013`, and
 * the most repeated defect in this codebase.
 */

import { ageFrom } from '@/application/profile/profile';
import type { Profile, Sex } from '@/core/profile';

export type AboutYouState =
  /** Nothing has been looked up yet, or the lookup failed. Says nothing, shows nothing. */
  | { readonly status: 'unknown' }
  /** The store answered and there is no profile. Now an invitation is honest. */
  | { readonly status: 'unanswered' }
  | {
      /** Derived, never stored — a stored age is wrong from the next birthday onwards. */
      readonly age: number | null;
      /** Kept as well as the age, because the editor has to show back what was given. */
      readonly birthYear: number | null;
      readonly heightCm: number | null;
      readonly sex: Sex;
      readonly status: 'known';
    };

export const NOT_READ = { status: 'unknown' } as const;
export const NOTHING_GIVEN = { status: 'unanswered' } as const;

/**
 * What a successful read means.
 *
 * `null` is a real answer here and only here: the store looked and found no profile, which is what
 * somebody who skipped the first run has. It is distinct from the two states above, and keeping them
 * apart is the whole point of the file.
 */
export function aboutYouFrom(profile: Profile | null, today: Date): AboutYouState {
  if (profile === null) return NOTHING_GIVEN;

  return {
    age: ageFrom(profile.birthYear, today),
    birthYear: profile.birthYear,
    heightCm: profile.heightCm,
    sex: profile.sex,
    status: 'known',
  };
}

const SEX_WORDS: Readonly<Record<Sex, string>> = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  preferNotToSay: 'Rather not say',
};

/**
 * The one line shown when the block is collapsed, or `null` for no line at all.
 *
 * **Only what was actually given.** A profile written by a skip has a null year and a sex nobody
 * chose, and printing *"Rather not say"* on its own would present a non-answer as an answer. Where
 * nothing was given, the invitation is shown instead — which is true, and is the only sentence here
 * that asks for anything.
 */
export function summaryLine(state: AboutYouState): string | null {
  if (state.status === 'unknown') return null;
  if (state.status === 'unanswered') return INVITE;

  const parts = [
    state.age === null ? null : `${state.age} years old`,
    state.heightCm === null ? null : `${state.heightCm} cm`,
    state.sex === 'preferNotToSay' ? null : SEX_WORDS[state.sex],
  ].filter((part): part is string => part !== null);

  return parts.length === 0 ? INVITE : parts.join(' · ');
}

/** The only line here that asks for something, and it is shown only once the store has answered. */
export const INVITE = 'Add your year of birth to get a biological age';

import assert from 'node:assert/strict';
import test from 'node:test';

import { ageFrom, createProfiles, plausibleBirthYear } from '../src/application/profile/profile';
import { createMemoryProfileStore } from '../src/infrastructure/profile/profileStore';

const TODAY = new Date('2026-08-20T12:00:00.000Z');

/** PORTED from Legacy `profileHelpers.ts`: a four-digit number that is not plausibly a birth year. */
test('an implausible birth year is refused rather than stored', () => {
  assert.equal(plausibleBirthYear(1982, TODAY), 1982);
  assert.equal(plausibleBirthYear(1899, TODAY), null);
  assert.equal(plausibleBirthYear(2026, TODAY), null, 'this year is not a birth year for a user');
  assert.equal(plausibleBirthYear(2022, TODAY), null, 'within five years is a typo, not a person');
  assert.equal(plausibleBirthYear(null, TODAY), null);
  assert.equal(plausibleBirthYear(Number.NaN, TODAY), null);
});

/**
 * Age is derived, never stored. A stored age is wrong from the next birthday onwards and the
 * calculation would use the stale one for a year without anybody noticing.
 */
test('age comes from the year, so it cannot go stale', () => {
  assert.equal(ageFrom(1982, TODAY), 44);
  assert.equal(ageFrom(1982, new Date('2027-01-01T00:00:00.000Z')), 45);
  assert.equal(ageFrom(null, TODAY), null);
});

test('an age outside a human lifespan is no age at all', () => {
  assert.equal(ageFrom(1850, TODAY), null);
  assert.equal(ageFrom(2027, TODAY), null);
});

test('nothing saved means nothing read, not an empty profile', async () => {
  const profiles = createProfiles(createMemoryProfileStore());
  assert.equal(await profiles.read(), null);
});

test('a profile survives being written and read back', async () => {
  const profiles = createProfiles(createMemoryProfileStore());
  const saved = await profiles.save(1982, 'male');

  assert.equal(saved.birthYear, 1982);
  assert.equal(saved.sex, 'male');
  assert.deepEqual(await profiles.read(), saved);
});

/**
 * Both answers are optional. "Prefer not to say" is a real answer the figure has to cope with, and
 * a missing birth year means the age calculation returns null rather than a number built on a guess.
 */
test('both answers may be left unanswered', async () => {
  const profiles = createProfiles(createMemoryProfileStore());
  const saved = await profiles.save(null, 'preferNotToSay');

  assert.equal(saved.birthYear, null);
  assert.equal(ageFrom(saved.birthYear, TODAY), null);
});

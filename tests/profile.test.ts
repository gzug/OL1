import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ageFrom,
  createProfiles,
  plausibleBirthYear,
  plausibleHeightCm,
} from '../src/application/profile/profile';
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

/**
 * The range exists to catch a UNIT, not to judge a body: metres land on 1.75 and millimetres on
 * 1750, and every height a person actually has falls between.
 */
test('a height that is not in centimetres is refused', () => {
  assert.equal(plausibleHeightCm(175), 175);
  assert.equal(plausibleHeightCm(1.75), null, 'metres');
  assert.equal(plausibleHeightCm(1750), null, 'millimetres');
  assert.equal(plausibleHeightCm(175.4), 175, 'a profile has no use for a fraction of a centimetre');
  assert.equal(plausibleHeightCm(null), null);
  assert.equal(plausibleHeightCm(Number.NaN), null);
});

test('a profile that has never been written has no height either', async () => {
  const profiles = createProfiles(createMemoryProfileStore());
  const saved = await profiles.save(1982, 'male');

  assert.equal(saved.heightCm, null);
});

/**
 * THE TRAP THIS EXISTS FOR. `AboutYou` on the Twin calls `save(birthYear, sex)` and knows nothing
 * about a height — it was written before there was one, and it is not this branch's file to edit.
 * A `save` that wrote a whole fresh record would drop the height every time somebody corrected
 * their birth year, and nothing on any screen would say so.
 */
test('correcting your birth year does not wipe the height you gave', async () => {
  const profiles = createProfiles(createMemoryProfileStore());
  await profiles.saveHeight(183);

  const after = await profiles.save(1982, 'male');

  assert.equal(after.heightCm, 183, 'save() replaced the record instead of merging into it');
  assert.equal(after.birthYear, 1982);
  assert.equal(after.sex, 'male');
});

test('giving a height does not wipe the birth year or the sex', async () => {
  const profiles = createProfiles(createMemoryProfileStore());
  await profiles.save(1982, 'female');

  const after = await profiles.saveHeight(168);

  assert.equal(after.birthYear, 1982);
  assert.equal(after.sex, 'female');
  assert.equal(after.heightCm, 168);
});

/**
 * A first write has nothing to merge with, and must not invent a sex nobody chose. `preferNotToSay`
 * is the answer that means "not answered", which is exactly what is true at that moment.
 */
test('a height given before anything else leaves the other answers unanswered', async () => {
  const profiles = createProfiles(createMemoryProfileStore());
  const saved = await profiles.saveHeight(175);

  assert.equal(saved.birthYear, null);
  assert.equal(saved.sex, 'preferNotToSay');
});

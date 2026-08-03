import assert from 'node:assert/strict';
import test from 'node:test';

import { SEED_HUBS } from '../src/ui/hubs/catalog';
import { NAME_MAX, draftId, draftPreview, draftProblem } from '../src/ui/hubs/newHub';

/**
 * Hubs are data the user makes, which means the ids in `catalog.ts` stop being written by anyone who
 * knows what a route is. Everything a typed name could break has to be caught here.
 */

test('an id is derived from the name, not asked for', () => {
  assert.equal(draftId('Hydration'), 'hydration');
  assert.equal(draftId('  Cold plunge  '), 'cold-plunge');
  assert.equal(draftId('Zone 2 / easy runs'), 'zone-2-easy-runs');
  assert.equal(draftId('Ötzi!!'), 'tzi', 'non-ascii is dropped rather than smuggled into a URL');
});

test('a name with nothing usable in it is refused', () => {
  for (const name of ['', '   ', '!!!', '///']) {
    assert.equal(
      draftProblem({ focus: 'x', name }),
      'empty',
      `"${name}" produced an empty id and was accepted anyway`,
    );
  }
});

test('a hub cannot take an id a screen already owns', () => {
  for (const name of ['Table', 'Twin', 'Bootstrap', 'New hub']) {
    assert.equal(
      draftProblem({ focus: 'x', name }),
      'reserved',
      `"${name}" would shadow a route`,
    );
  }
});

test('a hub cannot take an id another hub already has', () => {
  for (const hub of SEED_HUBS) {
    assert.equal(
      draftProblem({ focus: 'x', name: hub.label }),
      'taken',
      `"${hub.label}" collides with the seeded hub of the same name`,
    );
  }
});

test('names stay short enough to sit in a circle on the orbit', () => {
  assert.equal(draftProblem({ focus: 'x', name: 'a'.repeat(NAME_MAX + 1) }), 'nameTooLong');
  assert.equal(draftProblem({ focus: 'x', name: 'a'.repeat(NAME_MAX) }), null);
});

test('a focus line is one line, not a paragraph', () => {
  assert.equal(draftProblem({ focus: 'x'.repeat(200), name: 'Hydration' }), 'focusTooLong');
});

test('a good draft has no problem, and previews what it would make', () => {
  const draft = { focus: 'How much you drink, and when.', name: 'Hydration' };
  assert.equal(draftProblem(draft), null);

  const preview = draftPreview(draft);
  assert.equal(preview.hub.id, 'hydration');
  assert.equal(preview.hub.label, 'Hydration');
  assert.equal(preview.hub.origin, 'user', 'a hub the user made must not claim to be built in');
  assert.equal(preview.hub.parentId, undefined);
  assert.equal(preview.coachName, 'Hydration Coach');
});

/**
 * A hub answered by another hub's coach is the confusion `coachForHub` returning undefined was
 * written to avoid, so a new hub gets its own coach rather than borrowing one.
 */
test('a new hub gets its own coach, never a borrowed one', () => {
  const preview = draftPreview({ focus: 'Grip and technique.', name: 'Climbing' });
  assert.equal(preview.hub.coachId, preview.hub.id);
  assert.ok(
    !SEED_HUBS.some((hub) => hub.coachId === preview.hub.coachId),
    'the new hub took a coach that already belongs to a seeded hub',
  );
});

test('an exercise type is the same act with a parent set', () => {
  const preview = draftPreview({ focus: 'Grip and technique.', name: 'Climbing', parentId: 'activity' });
  assert.equal(preview.hub.parentId, 'activity');
  assert.match(preview.where, /inside/);
});

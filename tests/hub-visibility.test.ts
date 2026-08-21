import assert from 'node:assert/strict';
import test from 'node:test';

import { hiddenHubs, hideWarning, visibleHubs, withDescendants } from '../src/application/hubs/visibility';
import { SEED_HUBS } from '../src/ui/hubs/catalog';

/**
 * Hidden, never deleted — the owner's decision on 2026-08-21, and the right one: a hub holds a
 * person's meals, sessions and blood panels, and a database has no undo button.
 */

test('a hidden hub leaves the ring and the rest keep their order', () => {
  const visible = visibleHubs(SEED_HUBS, ['sleep']);

  assert.ok(!visible.some((hub) => hub.id === 'sleep'));
  assert.deepEqual(
    visible.filter((hub) => hub.parentId === undefined).map((hub) => hub.id),
    SEED_HUBS.filter((hub) => hub.parentId === undefined && hub.id !== 'sleep').map((hub) => hub.id),
    'hiding one hub reordered the others',
  );
});

/**
 * **The part nobody expects.** Hide Exercise while Running and Gym stay visible and they are
 * visible in name only — nothing on any screen leads to them. A person would have hidden one hub
 * and lost three without being told.
 */
test('hiding a parent takes its children with it', () => {
  // Labs inside Health record is the one nesting that still ships — the sports stopped being hubs
  // on 2026-08-21, `docs/decisions/0014`.
  const going = withDescendants(SEED_HUBS, 'medical');

  assert.ok(going.includes('medical'));
  assert.ok(going.includes('labs'), 'Labs would have been left unreachable');
  assert.ok(!going.includes('nutrition'), 'it took a hub that was not inside it');
});

test('a hub with no children takes nothing with it', () => {
  assert.deepEqual(withDescendants(SEED_HUBS, 'sleep'), ['sleep']);
});

test('hidden and visible are exactly complementary', () => {
  const hidden = ['sleep', 'labs'];
  const visible = visibleHubs(SEED_HUBS, hidden);
  const away = hiddenHubs(SEED_HUBS, hidden);

  assert.equal(visible.length + away.length, SEED_HUBS.length);
  assert.deepEqual(away.map((hub) => hub.id).sort(), ['labs', 'sleep']);
});

/**
 * "Hide" is a word people read as "get rid of". The whole point of choosing hideable over deletable
 * is lost if the screen does not say the data survives.
 */
test('the warning always says the data is kept, and never says deleted about the data', () => {
  for (const count of [0, 1, 14]) {
    const warning = hideWarning(SEED_HUBS, 'sleep', count);
    assert.match(warning, /not deleted|Nothing is deleted/, `count ${count} failed to say data is kept`);
    assert.match(warning, /bring it back/, `count ${count} failed to say it is reversible`);
  }
});

test('the warning counts in a person’s words, singular and plural', () => {
  assert.match(hideWarning(SEED_HUBS, 'sleep', 1), /The 1 thing you logged/);
  assert.match(hideWarning(SEED_HUBS, 'sleep', 14), /The 14 things you logged/);
  assert.match(hideWarning(SEED_HUBS, 'sleep', 0), /Nothing is deleted/);
});

/** And it names the children, because that is the surprise. */
test('the warning names what else goes, and stays silent when nothing does', () => {
  const medical = hideWarning(SEED_HUBS, 'medical', 3);
  assert.ok(medical.includes('Labs'), 'the warning did not mention the hub that goes with it');
  assert.match(medical, /goes with it/);

  assert.ok(!hideWarning(SEED_HUBS, 'sleep', 3).includes('goes with it'));
  assert.ok(!hideWarning(SEED_HUBS, 'exercise', 3).includes('goes with it'), 'Exercise has no children now');
});

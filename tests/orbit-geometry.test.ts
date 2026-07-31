import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CENTRE,
  HUB_RADIUS,
  ORBIT_RADIUS,
  SPOKE_INNER,
  SPOKE_OUTER,
  STAGE,
  hubAngle,
  hubCentre,
  spoke,
} from '../src/ui/mockup/geometry';

const HUB_COUNT = 6;
const distanceFromCentre = (point: { x: number; y: number }) =>
  Math.hypot(point.x - CENTRE, point.y - CENTRE);

test('the six hubs sit on one ring, evenly spaced', () => {
  for (let index = 0; index < HUB_COUNT; index += 1) {
    assert.ok(
      Math.abs(distanceFromCentre(hubCentre(index)) - ORBIT_RADIUS) < 0.001,
      `hub ${index} is off the ring`,
    );
    assert.equal(hubAngle(index) - hubAngle(index === 0 ? 0 : index - 1), index === 0 ? 0 : 60);
  }
});

test('no hub sits on the vertical axis, where the centre stack lives', () => {
  for (let index = 0; index < HUB_COUNT; index += 1) {
    const { x } = hubCentre(index);
    assert.ok(
      Math.abs(x - CENTRE) > 1,
      `hub ${index} is directly above or below the centre and would collide with the stack`,
    );
  }
});

test('every hub fits inside the stage', () => {
  for (let index = 0; index < HUB_COUNT; index += 1) {
    const { x, y } = hubCentre(index);
    for (const value of [x, y]) {
      assert.ok(value - HUB_RADIUS >= 0 && value + HUB_RADIUS <= STAGE, `hub ${index} overflows`);
    }
  }
});

/**
 * The connection lines are the one place the mockup makes an architectural claim: one assistant
 * reaching into chosen domains, not six minds conferring. A hub-to-hub line would say the opposite,
 * so the invariant is pinned rather than left to the eye — every line points back at the centre,
 * and every line starts at the same radius.
 */
test('every spoke radiates from the centre and none connects two hubs', () => {
  for (let index = 0; index < HUB_COUNT; index += 1) {
    const line = spoke(index);
    const midpoint = { x: line.left + line.length / 2, y: line.top };

    const angle = (Math.atan2(midpoint.y - CENTRE, midpoint.x - CENTRE) * 180) / Math.PI;
    const expected = hubAngle(index) % 360;
    assert.ok(
      Math.abs(((angle - expected + 540) % 360) - 180) < 0.001,
      `spoke ${index} does not point at its hub`,
    );

    assert.ok(
      Math.abs(distanceFromCentre(midpoint) - (SPOKE_INNER + SPOKE_OUTER) / 2) < 0.001,
      `spoke ${index} does not start at the shared inner radius`,
    );
    assert.equal(line.length, SPOKE_OUTER - SPOKE_INNER);
  }
});

test('spokes stop short of the hubs they point at', () => {
  assert.ok(SPOKE_INNER > 0, 'a spoke starting at the exact centre would sit under the stack');
  assert.ok(SPOKE_OUTER < ORBIT_RADIUS - HUB_RADIUS, 'a spoke must not run into its hub');
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CENTRE,
  HUB_RADIUS,
  HUB_RADIUS_MIN,
  MAX_ORBIT_HUBS,
  ORBIT_RADIUS,
  SPOKE_INNER,
  STACK,
  STAGE,
  hubAngle,
  hubCentre,
  hubRadius,
  orbitOffset,
  spoke,
  spokeOuter,
  stackBox,
} from '../src/ui/mockup/geometry';

const HUB_COUNT = 6;

/**
 * Everything below this line predates hubs becoming data, and is deliberately unchanged: every
 * geometry function defaults to six, so these assertions still describe the ring exactly as it was.
 * They are the proof that making the orbit scale moved no pixels at the count that ships today.
 */
const SPOKE_OUTER = spokeOuter(HUB_COUNT);
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

/**
 * Hubs are data the user can add to, so the ring has to hold more than six. The mechanism is that
 * circles shrink and re-space; the ring itself cannot grow, because the stage is fixed at 404 and a
 * hub already sits within five pixels of the edge.
 */

test('six hubs are exactly the size they always were', () => {
  assert.equal(hubRadius(HUB_COUNT), HUB_RADIUS);
  assert.equal(hubRadius(), HUB_RADIUS, 'the default count must still be the seeded six');
});

test('hubs never overlap, at any count the ring claims to support', () => {
  for (let count = 3; count <= MAX_ORBIT_HUBS; count += 1) {
    const radius = hubRadius(count);
    const first = hubCentre(0, count);
    const second = hubCentre(1, count);
    const gap = Math.hypot(second.x - first.x, second.y - first.y) - radius * 2;

    assert.ok(gap > 0, `at ${count} hubs the circles overlap by ${(-gap).toFixed(1)}`);
    assert.ok(
      radius >= HUB_RADIUS_MIN,
      `at ${count} hubs the circles shrink to ${radius.toFixed(1)}, past the readable minimum`,
    );
  }
});

test('circles only shrink once there is a reason to, and never grow', () => {
  let previous = hubRadius(3);
  for (let count = 4; count <= MAX_ORBIT_HUBS; count += 1) {
    const radius = hubRadius(count);
    assert.ok(radius <= previous, `${count} hubs produced a bigger circle than ${count - 1} did`);
    previous = radius;
  }
  assert.equal(hubRadius(12), HUB_RADIUS, 'twelve hubs still fit at full size; nothing should shrink');
});

test('every hub fits inside the stage at every supported count', () => {
  for (let count = 3; count <= MAX_ORBIT_HUBS; count += 1) {
    const radius = hubRadius(count);
    for (let index = 0; index < count; index += 1) {
      const { x, y } = hubCentre(index, count);
      for (const value of [x, y]) {
        assert.ok(
          value - radius >= 0 && value + radius <= STAGE,
          `hub ${index} of ${count} overflows the stage`,
        );
      }
    }
  }
});

/**
 * A hub CAN sit on the vertical axis once the count is not six, and that is allowed — the centre
 * stack is 160 tall, so its edge is 80 from the centre while the ring is at 165. What must stay true
 * is that the circle clears the stack, which is a different and stricter claim than avoiding 90°.
 */
test('no hub ever covers the centre stack, whatever the count', () => {
  for (let count = 3; count <= MAX_ORBIT_HUBS; count += 1) {
    const radius = hubRadius(count);
    const box = stackBox(count);

    for (let index = 0; index < count; index += 1) {
      // Distance from the hub centre to the nearest point of the box, measured here rather than
      // taken from geometry.ts, so the assertion does not simply restate the implementation.
      const { x, y } = hubCentre(index, count);
      const nearestX = Math.max(CENTRE - box.width / 2, Math.min(x, CENTRE + box.width / 2));
      const nearestY = Math.max(CENTRE - box.height / 2, Math.min(y, CENTRE + box.height / 2));
      const distance = Math.hypot(x - nearestX, y - nearestY);

      assert.ok(
        distance >= radius,
        `hub ${index} of ${count} overlaps the centre stack by ${(radius - distance).toFixed(1)}`,
      );
    }
  }
});

test('the centre keeps its full size at six, and only gives way when the ring cannot', () => {
  assert.deepEqual(stackBox(HUB_COUNT), { height: STACK.height, width: STACK.width });
  assert.notEqual(orbitOffset(HUB_COUNT), null, 'six hubs must still be placeable at full size');
  assert.equal(orbitOffset(HUB_COUNT), 0, 'six hubs must sit exactly where they always have');

  for (let count = 3; count <= MAX_ORBIT_HUBS; count += 1) {
    const box = stackBox(count);
    assert.ok(box.width <= STACK.width && box.height <= STACK.height, 'the centre must never grow');
    assert.ok(
      box.width >= STACK.width * 0.8,
      `at ${count} hubs the centre shrinks to ${box.width.toFixed(0)}, too narrow to hold the insight`,
    );
  }
});

test('spokes still stop short of their hubs when the hubs have shrunk', () => {
  for (let count = 3; count <= MAX_ORBIT_HUBS; count += 1) {
    assert.ok(
      spokeOuter(count) < ORBIT_RADIUS - hubRadius(count),
      `at ${count} hubs a spoke runs into the circle it points at`,
    );
  }
});

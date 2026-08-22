import assert from 'node:assert/strict';
import test from 'node:test';

import { sparkline } from '../src/application/labs/sparkline';

/**
 * Ported from Legacy, and what is ported is the five refusals rather than the arithmetic. Each is a
 * way a small chart tells a lie that nothing catches.
 */

/** A null out of a store becomes `L NaN`, and one of those makes the whole line vanish silently. */
test('a value that is not a number never reaches the path', () => {
  const { d, points } = sparkline([10, Number.NaN, 30, Number.POSITIVE_INFINITY, 20], 100, 40);

  assert.ok(!d.includes('NaN'), `a non-finite point reached the path: ${d}`);
  assert.ok(!d.includes('Infinity'));
  assert.equal(points.length, 3, 'the three real values are plotted, and only those');
});

/** One point is not a trend, and a single dot reads as one. */
test('fewer than two points draws nothing at all', () => {
  assert.equal(sparkline([], 100, 40).d, '');
  assert.equal(sparkline([42], 100, 40).d, '');
  assert.equal(sparkline([Number.NaN, Number.NaN], 100, 40).d, '');
  assert.notEqual(sparkline([10, 20], 100, 40).d, '');
});

/** SVG's y grows downward. Getting this wrong draws every improvement as a decline. */
test('the larger value sits higher on the chart', () => {
  const rising = sparkline([10, 90], 100, 40);

  assert.ok((rising.points[1]?.y ?? 0) < (rising.points[0]?.y ?? 0), '90 must be above 10');
});

/** Every value equal is a division by zero away from a line glued to the floor. */
test('a series that never moves draws down the middle, not along the bottom', () => {
  const flat = sparkline([50, 50, 50], 100, 40);

  const ys = flat.points.map((point) => point.y);
  assert.equal(new Set(ys).size, 1, 'a flat series is a flat line');
  assert.ok((ys[0] as number) > 2 && (ys[0] as number) < 38, `pinned to an edge at y=${ys[0]}`);
});

/** A stroke clipped by the tile edge looks like a rendering fault rather than a value. */
test('no coordinate escapes the inset', () => {
  const { points } = sparkline([1, 1000, 500, 2], 100, 40, 3);

  for (const point of points) {
    assert.ok(point.x >= 3 && point.x <= 97, `x=${point.x} is outside the inset`);
    assert.ok(point.y >= 3 && point.y <= 37, `y=${point.y} is outside the inset`);
  }
});

/** A mean drawn through two points is a line through a line, and says "average" about a pair. */
test('the baseline needs three points before it means anything', () => {
  assert.equal(sparkline([10, 20], 100, 40).baselineY, null);
  assert.notEqual(sparkline([10, 20, 30], 100, 40).baselineY, null);

  const middle = sparkline([0, 50, 100], 100, 40).baselineY;
  assert.ok(middle !== null && middle > 15 && middle < 25, `the mean of 0,50,100 sat at ${middle}`);
});

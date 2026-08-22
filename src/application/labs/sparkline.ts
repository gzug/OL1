/**
 * Turning a series of numbers into an SVG path.
 *
 * **PORTED from Legacy `data/insights/sparklinePath.ts`**, whose value is not the arithmetic — it is
 * the five constraints its header states, each of which is a way a small chart lies:
 *
 * 1. **Non-finite points are dropped, never plotted.** A null from a store becomes `L NaN` in a
 *    path string, and one of those poisons the whole line — the chart simply vanishes, with no
 *    error anywhere.
 * 2. **A line needs two points.** With none or one the path is empty and the caller shows an honest
 *    baseline rather than a single dot, which reads as a trend of one.
 * 3. **Higher value sits higher.** SVG's y grows downward, so it is inverted; getting this wrong
 *    draws every improvement as a decline.
 * 4. **A flat series draws down the middle**, not pinned to the floor. Every value being equal is a
 *    division by zero away from a line glued to the bottom edge, which reads as "as low as it goes".
 * 5. **Every coordinate stays inside the inset**, so a stroke is never clipped by the tile edge.
 *
 * **What is not ported:** the bar rectangles, the gradient area fill, and the axis-tick formatter.
 * Legacy drew wearable tiles with all three; a blood marker over a handful of panels is a line, and
 * a filled area under two points implies a volume that nothing measured.
 *
 * Pure: numbers in, a path string out. No React, no store, no clock.
 */

export type Sparkline = {
  /**
   * Screen-y of the mean, in the path's own coordinates. **Null below three points**, because a
   * baseline through two is a line through a line — it says "average" about a pair.
   */
  readonly baselineY: number | null;
  /** The path, `M … L …`. Empty when fewer than two finite values exist. */
  readonly d: string;
  /** The coordinates, so a caller can mark the last point without re-deriving it. */
  readonly points: readonly { readonly x: number; readonly y: number }[];
};

export function sparkline(
  values: readonly number[],
  width: number,
  height: number,
  inset = 2,
): Sparkline {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length < 2) return { baselineY: null, d: '', points: [] };

  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const flat = !(hi - lo > 0);
  const span = flat ? 1 : hi - lo;

  const x0 = inset;
  const x1 = Math.max(inset, width - inset);
  const y0 = inset;
  const y1 = Math.max(inset, height - inset);
  const yMid = (y0 + y1) / 2;

  const points = finite.map((value, index) => ({
    x: x0 + (index * (x1 - x0)) / (finite.length - 1),
    // Inverted: the largest value maps to `y0`, the top.
    y: flat ? yMid : y0 + (1 - (value - lo) / span) * (y1 - y0),
  }));

  const d = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const mean = finite.reduce((total, value) => total + value, 0) / finite.length;
  const baselineY =
    finite.length < 3 ? null : flat ? yMid : y0 + (1 - (mean - lo) / span) * (y1 - y0);

  return { baselineY, d, points };
}

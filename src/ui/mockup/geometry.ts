/**
 * Orbit geometry.
 *
 * No SVG library is installed, so the ring and its connection lines are plain Views placed by
 * trigonometry. A line is a 1px-tall View positioned at the midpoint of the segment and rotated
 * about its own centre, which is the one rotation React Native does without a transform origin.
 *
 * The hub count is no longer six. Hubs are data the user can add to, so every function here takes a
 * count and defaults to the seeded six — at that count the numbers are exactly what they were, which
 * is what keeps `tests/orbit-geometry.test.ts` a proof that the ring moved no pixels.
 *
 * As hubs are added the circles shrink and re-space; the ring itself stays put. The stage is a fixed
 * 404, so a hub must sit within `ORBIT_RADIUS + hubRadius` of the centre — that leaves about five
 * pixels of room to widen the ring, which is not worth having. "The ring grows" is not available on
 * a phone; shrinking the circles is the whole of the mechanism.
 */

export const STAGE = 404;
export const CENTRE = STAGE / 2;
export const ORBIT_RADIUS = 165;

/** The seeded hubs. Every count-taking function defaults to this, so the ring is unchanged at six. */
export const DEFAULT_HUB_COUNT = 6;

/** What a hub circle measures when there is room for it, which there is up to twelve. */
export const HUB_RADIUS = 32;

/** Below this a label no longer fits inside its circle, so the shrinking stops here. */
export const HUB_RADIUS_MIN = 21;

/** Paper left between neighbours, so the ring reads as separate objects rather than as a chain. */
const HUB_GAP = 12;

/**
 * Past this the gap closes faster than the circle shrinks. The circles do not actually collide until
 * about twenty-five — this is the readability limit, not the collision one, and it is a guess worth
 * tuning once anyone has really filled a ring.
 */
export const MAX_ORBIT_HUBS = 19;

/** Where a connection line starts: the collapsed centre disc. */
export const SPOKE_INNER = 48;

/** The collapsed centre while selecting. */
export const DISC_RADIUS = 44;

const TO_RADIANS = Math.PI / 180;

/**
 * Circles shrink to keep `HUB_GAP` of paper between neighbours, and never past `HUB_RADIUS_MIN`.
 *
 * The distance between adjacent hub centres is the ring's CHORD, not its arc. Sizing against the arc
 * would leave the circles touching, because the arc is the longer of the two.
 */
export function hubRadius(count: number = DEFAULT_HUB_COUNT): number {
  const chord = 2 * ORBIT_RADIUS * Math.sin(Math.PI / count);
  return Math.max(HUB_RADIUS_MIN, Math.min(HUB_RADIUS, (chord - HUB_GAP) / 2));
}

/** Where a connection line stops: just short of a hub, which moves in as the hub shrinks. */
export function spokeOuter(count: number = DEFAULT_HUB_COUNT): number {
  return ORBIT_RADIUS - hubRadius(count) - 6;
}

/**
 * The centre stack at its design size — the drift number, its caption, the insight, the focus pill.
 * `HomeMockup` reads `stackBox()` rather than this, because the box gives way when the ring cannot.
 */
export const STACK = { height: 160, width: 240 } as const;

const STACK_HALF_DIAGONAL = Math.hypot(STACK.width / 2, STACK.height / 2);

/** Paper between a circle and the text box, so "clears it" never means "touches it". */
const STACK_MARGIN = 6;

/**
 * Whether a hub circle would reach the centre box.
 *
 * The measurement is circle-to-rectangle: the distance from the hub's centre to the NEAREST point on
 * the box. Comparing the two axes separately treats the circle as a square, which is what an earlier
 * version did — it rejected placements that were geometrically fine, because a circle only occupies
 * its corner in the square approximation.
 */
export function clearsStack(
  degrees: number,
  radius: number,
  box: { height: number; width: number } = STACK,
): boolean {
  const radians = degrees * TO_RADIANS;
  const x = ORBIT_RADIUS * Math.cos(radians);
  const y = ORBIT_RADIUS * Math.sin(radians);

  const nearestX = Math.max(-box.width / 2, Math.min(x, box.width / 2));
  const nearestY = Math.max(-box.height / 2, Math.min(y, box.height / 2));

  return Math.hypot(x - nearestX, y - nearestY) >= radius + STACK_MARGIN;
}

/**
 * How far the whole ring is rotated so no hub lands on the centre stack, or `null` when no rotation
 * can achieve it.
 *
 * The stack is wide and short, so the dangerous positions are the DIAGONALS — roughly 23° to 43° out
 * from horizontal, and its three mirrors — not the vertical. A hub straight above the centre clears
 * it by fifty pixels; a hub at 144° does not, which is exactly what five evenly spaced hubs produce.
 * The comment that used to live here claimed the opposite, and the test found the truth.
 *
 * Rotating the whole ring keeps the spacing even, which matters: uneven spacing reads as a mistake,
 * a ring turned a few degrees reads as a ring. Zero is returned whenever it works, so six hubs sit
 * exactly where they always have.
 *
 * Those four danger bands cut the circle into four arcs — two wide, two narrow — and past six hubs
 * the even spacing cannot be threaded between them at any rotation. `stackBox` is what gives then.
 */
export function orbitOffset(count: number = DEFAULT_HUB_COUNT): number | null {
  const radius = hubRadius(count);
  const step = 360 / count;

  for (let offset = 0; offset < step; offset += 0.5) {
    let allClear = true;
    for (let index = 0; index < count; index += 1) {
      if (!clearsStack(offset + index * step, radius)) {
        allClear = false;
        break;
      }
    }
    if (allClear) return offset;
  }

  return null;
}

/**
 * The centre stack's size at a given hub count.
 *
 * Full size whenever the ring can be rotated clear of it. When it cannot, the box shrinks until its
 * half-diagonal fits inside `ORBIT_RADIUS - hubRadius` — at which point no hub can reach it from any
 * angle, and the rotation stops mattering.
 *
 * This is the honest trade and it is worth naming: a crowded ring leaves the centre less room. The
 * alternatives were a wider ring, which the fixed 404 stage does not allow, and uneven spacing,
 * which looks broken. Losing about eight per cent of the centre's width at seven hubs is the
 * cheapest of the three, and at six it costs nothing at all.
 */
export function stackBox(count: number = DEFAULT_HUB_COUNT): { height: number; width: number } {
  if (orbitOffset(count) !== null) return { height: STACK.height, width: STACK.width };

  const scale = (ORBIT_RADIUS - hubRadius(count) - STACK_MARGIN) / STACK_HALF_DIAGONAL;
  return { height: STACK.height * scale, width: STACK.width * scale };
}

/** Hub `index` of `count`, starting at the right and going clockwise. At six this is `index * 60`. */
export function hubAngle(index: number, count: number = DEFAULT_HUB_COUNT): number {
  return (orbitOffset(count) ?? 0) + index * (360 / count);
}

export function hubCentre(
  index: number,
  count: number = DEFAULT_HUB_COUNT,
): { x: number; y: number } {
  const radians = hubAngle(index, count) * TO_RADIANS;
  return {
    x: CENTRE + ORBIT_RADIUS * Math.cos(radians),
    y: CENTRE + ORBIT_RADIUS * Math.sin(radians),
  };
}

/**
 * A connection line, always centre to hub. There is no function here that takes two hubs, and that
 * is the point: a hub-to-hub line would draw six conferring minds, which is the architecture we
 * decided against. One assistant reaching into chosen domains is what the spokes have to say.
 */
export function spoke(
  index: number,
  count: number = DEFAULT_HUB_COUNT,
): {
  left: number;
  length: number;
  rotate: string;
  top: number;
} {
  const radians = hubAngle(index, count) * TO_RADIANS;
  const outer = spokeOuter(count);
  const midpoint = (SPOKE_INNER + outer) / 2;
  const length = outer - SPOKE_INNER;
  return {
    left: CENTRE + midpoint * Math.cos(radians) - length / 2,
    length,
    rotate: `${hubAngle(index, count)}deg`,
    top: CENTRE + midpoint * Math.sin(radians),
  };
}

/**
 * Orbit geometry.
 *
 * No SVG library is installed, so the ring and its connection lines are plain Views placed by
 * trigonometry. A line is a 1px-tall View positioned at the midpoint of the segment and rotated
 * about its own centre, which is the one rotation React Native does without a transform origin.
 *
 * The hubs sit at 0°, 60°, 120°, 180°, 240° and 300° measured from the positive x-axis, which
 * leaves the vertical corridor free. That is not decoration: the centre stack is a tall, narrow
 * column, and a hub at the top or bottom would sit in it.
 */

export const STAGE = 404;
export const CENTRE = STAGE / 2;
export const ORBIT_RADIUS = 165;
export const HUB_RADIUS = 32;

/** Where a connection line starts and stops: the collapsed centre disc out to just short of a hub. */
export const SPOKE_INNER = 48;
export const SPOKE_OUTER = ORBIT_RADIUS - HUB_RADIUS - 6;

/** The collapsed centre while selecting. */
export const DISC_RADIUS = 44;

const TO_RADIANS = Math.PI / 180;

/** Hub `index` of six, starting at the right and going clockwise on screen. */
export function hubAngle(index: number): number {
  return index * 60;
}

export function hubCentre(index: number): { x: number; y: number } {
  const radians = hubAngle(index) * TO_RADIANS;
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
export function spoke(index: number): {
  left: number;
  length: number;
  rotate: string;
  top: number;
} {
  const radians = hubAngle(index) * TO_RADIANS;
  const midpoint = (SPOKE_INNER + SPOKE_OUTER) / 2;
  const length = SPOKE_OUTER - SPOKE_INNER;
  return {
    left: CENTRE + midpoint * Math.cos(radians) - length / 2,
    length,
    rotate: `${hubAngle(index)}deg`,
    top: CENTRE + midpoint * Math.sin(radians),
  };
}

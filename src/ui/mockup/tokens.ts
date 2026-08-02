/**
 * Mockup-only constants. Everything with a colour that belongs to the product now comes from
 * `@/ui/theme` instead — this file holds the two things that deliberately do NOT theme.
 */

/**
 * The mockup banner sits outside the palette on purpose, so it cannot be mistaken for product UI.
 * Both values are fixed rather than themed: the amber is the warning, and the ink is chosen to stay
 * legible on that amber in light and dark alike. Theming either one would let the banner blend in,
 * which is the single thing it must never do.
 */
export const banner = {
  background: '#C8A227',
  ink: '#1B2420',
} as const;

/** The Android reference size (OnePlus 13R class). On web the mockup refuses to stretch past this. */
export const frame = {
  height: 892,
  width: 412,
} as const;

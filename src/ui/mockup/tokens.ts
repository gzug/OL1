/**
 * Mockup tokens. Shared by both screens so the two read as one system.
 *
 * These are the bootstrap screen's colours, kept deliberately: the mockups are meant to look like
 * the same product, not like a separate design exercise. When a real design system lands, this file
 * is the single place it replaces.
 */

export const color = {
  accent: '#E7FF57',
  background: '#0A0D12',
  hairline: '#252C38',
  /** Deliberately outside the product palette, so the mockup banner cannot be mistaken for UI. */
  mockup: '#C8A227',
  surface: '#151A22',
  surfaceRaised: '#1C222C',
  text: '#FFFFFF',
  textMuted: '#AAB2BF',
  textQuiet: '#7F8998',
} as const;

/** The Android reference size (OnePlus 13R class). On web the mockup refuses to stretch past this. */
export const frame = {
  height: 892,
  width: 412,
} as const;

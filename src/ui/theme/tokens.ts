/**
 * Design tokens, ported from the Legacy app's `apps/mobile/src/theme/marathonTheme.ts`.
 *
 * This file has NO imports, and must keep it that way. Legacy learned that the hard way: a token
 * file that imports anything can join a circular-import cycle, and under Hermes that surfaces as a
 * crash on launch rather than a bundler warning.
 *
 * What was deliberately NOT ported yet: the sleep-phase ring tones, the ten-colour metric palette,
 * and the per-coach score colours. Nothing on either screen consumes them, and a token nobody reads
 * is indistinguishable from a token that is wrong. Port them when a screen needs them — the values
 * and the reasoning behind them are preserved in Legacy.
 */

/** The brand. One value, restated in both themes at the luminance each background needs. */
export const BRAND_GREEN = '#31796D';

export const lightTokens = {
  // Warm paper neutral - elegant, off the cold clinical grey, not cream-heavy.
  background: '#F4F4EF',
  surface: '#FFFFFF',
  surfaceSoft: '#EAEAE3',
  textPrimary: '#1B2420',
  textSecondary: '#586059',
  textTertiary: '#9AA29B',
  onBrand: '#FFFFFF',
  border: '#E3E3DB',
  borderSubtle: '#EDEDE6',
  hairline: '#DFDFD4',
  brandGreen: BRAND_GREEN,
  brandGreenDark: '#1E4A43',
  brandGreenSoft: '#E4EFEB',
  success: '#1AA978',
  warning: '#E8A832',
  critical: '#D45B58',
} as const;

export const darkTokens = {
  // Neutral charcoal - surfaces stay R≈G≈B (no green cast); green lives only in accents, which is
  // why `brandGreenSoft` keeps its tint while `surface` does not.
  background: '#0E0F10',
  surface: '#141517',
  surfaceSoft: '#1D1F21',
  textPrimary: '#F0F3EE',
  textSecondary: '#BFC8C0',
  textTertiary: '#7E877F',
  onBrand: '#F0F3EE',
  border: '#2A2D2F',
  borderSubtle: '#1B1D1F',
  hairline: '#26282A',
  brandGreen: '#54AD98',
  brandGreenDark: '#9BBBA8',
  brandGreenSoft: '#0F2A20',
  success: '#1EB580',
  warning: '#F0BC54',
  critical: '#D47878',
} as const;

/**
 * The semantic layer the components actually read.
 *
 * Legacy's equivalent mapped `accentSoft` to a plain grey surface and `accentBorder` to the tinted
 * one, which reads backwards at every call site. Corrected here: `accentSoft` is the tinted surface,
 * `accentBorder` is the line, `onAccent` is what stays legible on top of the accent itself.
 */
export type ThemeColors = {
  accent: string;
  accentBorder: string;
  accentSoft: string;
  background: string;
  /** The body figure's outline. A hairline, so the silhouette is an object rather than a shadow. */
  bodyOutline: string;
  /** A muscle with nothing behind it. Must read as "no reading", never as "nothing happened". */
  bodyRest: string;
  border: string;
  borderSubtle: string;
  danger: string;
  hairline: string;
  /**
   * The three steps of the load scale on the body figure, coolest to warmest.
   *
   * **Amber, and it stops there.** Red is a warning and nothing on that figure is entitled to make
   * one — the colour reports what was worked, and the coach says what to do about it in words. The
   * owner settled that on 2026-08-19. Three steps rather than a gradient because the scale is
   * relative to the busiest muscle of the week, and a smooth ramp would imply a precision the
   * underlying sessions cannot support.
   */
  loadMedium: string;
  loadSoft: string;
  loadStrong: string;
  onAccent: string;
  /**
   * Text and outlines that sit ON the scrim. Light in BOTH themes, because the scrim is dark in
   * both — reaching for the normal text colours here puts dark grey on dark grey.
   */
  onScrim: string;
  onScrimMuted: string;
  positive: string;
  /** Dims the screen behind a modal step. Ink-tinted in both themes, never pure black. */
  scrim: string;
  statusBar: 'dark' | 'light';
  surface: string;
  surfaceSoft: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  warning: string;
};

const l = lightTokens;
export const lightColors: ThemeColors = {
  accent: l.brandGreen,
  accentBorder: l.brandGreen,
  accentSoft: l.brandGreenSoft,
  background: l.background,
  bodyOutline: l.hairline,
  bodyRest: l.surfaceSoft,
  border: l.border,
  borderSubtle: l.borderSubtle,
  danger: l.critical,
  hairline: l.hairline,
  loadMedium: '#D98A34',
  loadSoft: '#EBCBA3',
  loadStrong: '#B9631B',
  onAccent: l.onBrand,
  onScrim: '#F4F4EF',
  onScrimMuted: 'rgba(244, 244, 239, 0.72)',
  positive: l.success,
  scrim: 'rgba(27, 36, 32, 0.55)',
  statusBar: 'dark',
  surface: l.surface,
  surfaceSoft: l.surfaceSoft,
  text: l.textPrimary,
  textMuted: l.textSecondary,
  textSubtle: l.textTertiary,
  warning: l.warning,
};

const d = darkTokens;
export const darkColors: ThemeColors = {
  accent: d.brandGreen,
  accentBorder: d.brandGreen,
  accentSoft: d.brandGreenSoft,
  background: d.background,
  bodyOutline: d.border,
  bodyRest: d.surfaceSoft,
  border: d.border,
  borderSubtle: d.borderSubtle,
  danger: d.critical,
  hairline: d.hairline,
  loadMedium: '#E8912F',
  loadSoft: '#6B4A22',
  loadStrong: '#F5A94A',
  onAccent: d.onBrand,
  onScrim: '#F0F3EE',
  onScrimMuted: 'rgba(240, 243, 238, 0.72)',
  positive: d.success,
  scrim: 'rgba(14, 15, 16, 0.72)',
  statusBar: 'light',
  surface: d.surface,
  surfaceSoft: d.surfaceSoft,
  text: d.textPrimary,
  textMuted: d.textSecondary,
  textSubtle: d.textTertiary,
  warning: d.warning,
};

/**
 * Font aliases, resolved to real families by `useFonts` in the root layout.
 *
 * Two Legacy bugs are fixed rather than carried over, both recorded in its own
 * `docs/planning/design-system.md`: `heading` pointed at `BrandMedium`, leaving the loaded
 * `BrandHeading` alias dead; and `mono` was an alias for the body font, so anything asking for
 * tabular code type silently got proportional prose.
 */
export const fontFamily = {
  body: 'BrandBody',
  display: 'BrandDisplay',
  heading: 'BrandHeading',
  medium: 'BrandMedium',
  semi: 'BrandSemiBold',
  serif: 'BrandSerif',
  serifItalic: 'BrandSerifItalic',
  serifLight: 'BrandSerifLight',
  strong: 'BrandStrong',
} as const;

export const spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, xxl: 40, xxxl: 64 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 99 } as const;
export const typography = {
  body: 15,
  bodySmall: 14,
  caption: 13,
  heroInterpretation: 20,
  heroName: 36,
  heroSub: 14,
  micro: 12,
  subtitle: 17,
} as const;
export const lineHeights = {
  body: 21,
  bodySmall: 19,
  caption: 17,
  heroInterpretation: 25,
  subtitle: 21,
} as const;
export const tracking = { normal: 0, tight: -0.8, wide: 0.5, wider: 1.2 } as const;
export const layout = { maxWidth: 480, screenPaddingH: 18 } as const;

/**
 * Stroke weights. One vocabulary for every drawn line, so icons, rings and dividers stay visually
 * related instead of each component picking its own number. `icon: 1.8` comes from the brand
 * monogram's stroke-to-diameter ratio at the 24px grid — it is what makes an icon read as ours.
 */
export const strokeWidth = { icon: 1.8, ring: 14, ringSmall: 5.5 } as const;

/**
 * Motion, in ms. `breath` is the once-per-open hero draw — a greeting, not a celebration.
 * Every consumer must honour `AccessibilityInfo.isReduceMotionEnabled()` and jump to the end state.
 */
export const motion = { instant: 0, quick: 140, calm: 320, breath: 1200 } as const;

export const elevation = {
  none: { elevation: 0, shadowColor: 'transparent', shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  quiet: { elevation: 2, shadowColor: '#000000', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.08, shadowRadius: 8 },
  lifted: { elevation: 6, shadowColor: '#000000', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.12, shadowRadius: 16 },
} as const;

/**
 * Measurements use tabular figures so digits do not jitter as values change. Judgements do not.
 *
 * Deliberately not `as const`, unlike every other token here: React Native types `fontVariant` as a
 * mutable array, so a readonly tuple will not assign inside `StyleSheet.create`. The cast says that
 * in the only way this file can — it stays import-free, so it cannot name `TextStyle` directly.
 */
export const numerals = { tabular: { fontVariant: ['tabular-nums'] as 'tabular-nums'[] } };

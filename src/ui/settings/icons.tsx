import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { strokeWidth, useTheme } from '@/ui/theme';

/**
 * The settings icons, drawn here rather than installed.
 *
 * **Why draw them.** The look the owner asked for is a row of icons, and this app had none — not
 * one, anywhere. Two ways to fix that: add an icon package, or draw the dozen we need in the SVG
 * library already shipping. Drawn wins on three counts, and only the third is about taste.
 *
 * 1. **No new dependency.** `react-native-svg` is already here for the body figure and the orbit.
 * 2. **They can be ours.** `strokeWidth.icon` has sat unused in `tokens.ts` since the beginning —
 *    1.8, taken from the brand monogram's stroke-to-diameter ratio. Every icon here uses it, which
 *    is what makes them read as this app's rather than as a set somebody downloaded.
 * 3. **One of them could not be bought.** `HubsIcon` is the ring: a centre with three places around
 *    it and spokes between. No icon package has that, because it is a picture of this product.
 *
 * All twelve share one 24×24 grid and take their colour from the theme, so a row can dim an icon by
 * passing `muted` without every caller knowing a hex value.
 */

type IconProps = {
  /** The quieter of the two, for a row that is waiting on something. */
  readonly muted?: boolean;
  readonly size?: number;
};

function useStroke(muted: boolean | undefined): string {
  const { colors } = useTheme();
  return muted === true ? colors.textSubtle : colors.textMuted;
}

/** Every icon's shared frame. Keeping it in one place is what stops the twelve drifting apart. */
function Glyph({
  children,
  muted,
  size = 22,
}: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      fill="none"
      height={size}
      stroke={useStroke(muted)}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth.icon}
      viewBox="0 0 24 24"
      width={size}>
      {children}
    </Svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Path d="M15 5l-7 7 7 7" />
    </Glyph>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Circle cx="12" cy="8" r="3.6" />
      <Path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    </Glyph>
  );
}

export function GoalsIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Circle cx="12" cy="12" r="7.6" />
      <Circle cx="12" cy="12" r="3.4" />
    </Glyph>
  );
}

/**
 * The ring, and the one icon here that no package could have supplied.
 *
 * A centre with places around it and spokes between them — the same drawing as Home, at 24 pixels.
 * Three satellites rather than six: at this size six circles merge into a smudge, and three is
 * enough to say orbit.
 */
export function HubsIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Circle cx="12" cy="12" r="3.3" />
      <Circle cx="12" cy="4" r="1.9" />
      <Circle cx="19" cy="16" r="1.9" />
      <Circle cx="5" cy="16" r="1.9" />
      <Path d="M12 8.7V5.9M14.7 13.7l2.6 1.4M9.3 13.7l-2.6 1.4" />
    </Glyph>
  );
}

/** Two overlapping speech bubbles: more than one voice, which is what a coach list is. */
export function CoachesIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Path d="M15.5 13.2h-7l-3 2.6v-2.6h-1a1.6 1.6 0 01-1.6-1.6v-6A1.6 1.6 0 014.5 4h11a1.6 1.6 0 011.6 1.6v6a1.6 1.6 0 01-1.6 1.6z" />
      <Path d="M19.5 8.2h.5a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5h-.9v2.4l-2.8-2.4h-4.4" />
    </Glyph>
  );
}

export function ContactIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Rect height="13.2" rx="2.4" width="17.2" x="3.4" y="5.4" />
      <Path d="M4 7.6l8 5.6 8-5.6" />
    </Glyph>
  );
}

export function SubscriptionIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Rect height="12" rx="2.5" width="17.2" x="3.4" y="6" />
      <Path d="M3.4 10.3h17.2M6.8 14.4h3.2" />
    </Glyph>
  );
}

/** A circle that comes back round to its start. Walking the same questions again. */
export function OnboardingIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Path d="M20.2 12a8.2 8.2 0 11-2.9-6.2" />
      <Path d="M20.4 4.6v4.1h-4.1" />
    </Glyph>
  );
}

export function NotificationsIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Path d="M18 9.2a6 6 0 10-12 0c0 5-2 6.1-2 6.1h16s-2-1.1-2-6.1" />
      <Path d="M13.7 19a2 2 0 01-3.4 0" />
    </Glyph>
  );
}

export function PrivacyIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Rect height="9.6" rx="2.3" width="14.4" x="4.8" y="10.4" />
      <Path d="M8.2 10.4V7.7a3.8 3.8 0 017.6 0v2.7" />
    </Glyph>
  );
}

export function FeedbackIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Path d="M20 12.6c0 3.6-3.6 6.5-8 6.5a9.7 9.7 0 01-2.6-.35L5 20.5l1.3-3.3A6.1 6.1 0 014 12.6C4 9 7.6 6.1 12 6.1s8 2.9 8 6.5z" />
    </Glyph>
  );
}

export function AboutIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <Circle cx="12" cy="12" r="8.3" />
      <Path d="M12 11.2v5.2M12 7.9v.2" />
    </Glyph>
  );
}

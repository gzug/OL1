import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily, useTheme } from '@/ui/theme';

import { orbitHubs, type HubId } from '@/ui/hubs/catalog';

import { CENTRE, ORBIT_RADIUS, STAGE, hubCentre, hubRadius, spoke } from './geometry';

type OrbitProps = {
  onHubPress: (id: HubId) => void;
  /** Selecting mode draws the spokes and dims whatever is not chosen. */
  selecting: boolean;
  selected: readonly HubId[];
};

export function Orbit({ onHubPress, selecting, selected }: OrbitProps) {
  const { colors } = useTheme();
  /**
   * Top-level hubs only. Activity's exercise types are hubs too, but they belong inside Activity —
   * putting them on the ring would be the orbit claiming eleven domains instead of six.
   */
  const hubs = orbitHubs();
  /** Circles size themselves against how many there are. Six is the size they have always been. */
  const radius = hubRadius(hubs.length);

  return (
    <View style={styles.stage}>
      {selecting &&
        hubs.map((hub, index) => {
          const line = spoke(index, hubs.length);
          return (
            <View
              key={`spoke-${hub.id}`}
              pointerEvents="none"
              style={[
                styles.spoke,
                {
                  left: line.left,
                  top: line.top,
                  transform: [{ rotate: line.rotate }],
                  width: line.length,
                },
                selected.includes(hub.id)
                  ? { backgroundColor: colors.accent, opacity: 0.8 }
                  : { backgroundColor: colors.border },
              ]}
            />
          );
        })}

      {hubs.map((hub, index) => {
        const position = hubCentre(index, hubs.length);
        const isSelected = selecting && selected.includes(hub.id);
        const isDimmed = selecting && !selected.includes(hub.id);

        return (
          <Pressable
            accessibilityRole="button"
            key={hub.id}
            onPress={() => onHubPress(hub.id)}
            style={({ pressed }) => [
              styles.hub,
              {
                backgroundColor: isSelected ? colors.accentSoft : colors.surface,
                // `border` is a hairline meant for dividers, and on warm paper a white circle
                // outlined in it disappeared — the ring read as six faint smudges. `hairline` is the
                // darkest of the three neutral lines and is what makes a circle an object.
                borderColor: isSelected ? colors.accentBorder : colors.hairline,
                borderRadius: radius,
                borderWidth: isSelected ? 1.5 : 1,
                height: radius * 2,
                left: position.x - radius,
                top: position.y - radius,
                width: radius * 2,
              },
              isDimmed && styles.hubDimmed,
              pressed && styles.hubPressed,
            ]}>
            <Text
              numberOfLines={1}
              style={[
                styles.hubLabel,
                // The label tracks the circle so a shrunk hub does not overflow its own outline.
                { color: isDimmed ? colors.textSubtle : colors.text, fontSize: labelSize(radius) },
              ]}>
              {hub.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const ORBIT_STAGE_SIZE = STAGE;
export const ORBIT_CENTRE = CENTRE;
export const ORBIT_RING = ORBIT_RADIUS;

/**
 * Type scales with the circle, but not linearly and not below 9 — a label that shrinks in step with
 * its container stops being readable long before the container stops being visible.
 */
function labelSize(radius: number): number {
  return Math.max(9, Math.min(11, Math.round(radius * 0.34)));
}

const styles = StyleSheet.create({
  hub: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    position: 'absolute',
  },
  hubDimmed: {
    opacity: 0.32,
  },
  hubLabel: {
    fontFamily: fontFamily.medium,
  },
  hubPressed: {
    opacity: 0.65,
  },
  spoke: {
    height: 1,
    position: 'absolute',
  },
  stage: {
    height: STAGE,
    width: STAGE,
  },
});

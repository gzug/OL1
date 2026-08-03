import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily, useTheme } from '@/ui/theme';

import { orbitHubs, type HubId } from '@/ui/hubs/catalog';

import { CENTRE, HUB_RADIUS, ORBIT_RADIUS, STAGE, hubCentre, spoke } from './geometry';

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

  return (
    <View style={styles.stage}>
      {selecting &&
        hubs.map((hub, index) => {
          const line = spoke(index);
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
        const position = hubCentre(index);
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
                borderColor: isSelected ? colors.accentBorder : colors.border,
                borderWidth: isSelected ? 1.5 : 1,
                left: position.x - HUB_RADIUS,
                top: position.y - HUB_RADIUS,
              },
              isDimmed && styles.hubDimmed,
              pressed && styles.hubPressed,
            ]}>
            <Text style={[styles.hubLabel, { color: isDimmed ? colors.textSubtle : colors.text }]}>
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

const styles = StyleSheet.create({
  hub: {
    alignItems: 'center',
    borderRadius: HUB_RADIUS,
    height: HUB_RADIUS * 2,
    justifyContent: 'center',
    position: 'absolute',
    width: HUB_RADIUS * 2,
  },
  hubDimmed: {
    opacity: 0.32,
  },
  hubLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
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

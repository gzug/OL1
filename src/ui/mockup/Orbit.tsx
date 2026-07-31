import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HUBS, type HubId } from './fixtures';
import { CENTRE, HUB_RADIUS, ORBIT_RADIUS, STAGE, hubCentre, spoke } from './geometry';
import { color } from './tokens';

type OrbitProps = {
  onHubPress: (id: HubId) => void;
  /** Selecting mode draws the spokes and dims whatever is not chosen. */
  selecting: boolean;
  selected: readonly HubId[];
};

export function Orbit({ onHubPress, selecting, selected }: OrbitProps) {
  return (
    <View style={styles.stage}>
      {selecting &&
        HUBS.map((hub, index) => {
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
                selected.includes(hub.id) ? styles.spokeOn : styles.spokeOff,
              ]}
            />
          );
        })}

      {HUBS.map((hub, index) => {
        const position = hubCentre(index);
        const isSelected = selected.includes(hub.id);
        const isDimmed = selecting && !isSelected;

        return (
          <Pressable
            accessibilityRole="button"
            key={hub.id}
            onPress={() => onHubPress(hub.id)}
            style={({ pressed }) => [
              styles.hub,
              {
                left: position.x - HUB_RADIUS,
                top: position.y - HUB_RADIUS,
              },
              selecting && isSelected && styles.hubSelected,
              isDimmed && styles.hubDimmed,
              pressed && styles.hubPressed,
            ]}>
            <Text style={[styles.hubLabel, isDimmed && styles.hubLabelDimmed]}>{hub.label}</Text>
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
    backgroundColor: color.surface,
    borderColor: color.hairline,
    borderRadius: HUB_RADIUS,
    borderWidth: 1,
    height: HUB_RADIUS * 2,
    justifyContent: 'center',
    position: 'absolute',
    width: HUB_RADIUS * 2,
  },
  hubDimmed: {
    opacity: 0.32,
  },
  hubLabel: {
    color: color.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  hubLabelDimmed: {
    color: color.textQuiet,
  },
  hubPressed: {
    opacity: 0.65,
  },
  hubSelected: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.accent,
    borderWidth: 1.5,
  },
  spoke: {
    height: 1,
    position: 'absolute',
  },
  spokeOff: {
    backgroundColor: color.hairline,
  },
  spokeOn: {
    backgroundColor: color.accent,
    opacity: 0.8,
  },
  stage: {
    height: STAGE,
    width: STAGE,
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily, useTheme } from '@/ui/theme';

import { orbitHubs, ringPlaceCount, type HubId } from '@/ui/hubs/catalog';

import { CENTRE, ORBIT_RADIUS, STAGE, hubCentre, hubRadius, spoke } from './geometry';

type OrbitProps = {
  /** The `+` at the end of the ring. Absent while selecting coaches, when it is not offered. */
  onAddPress: () => void;
  onHubPress: (id: HubId) => void;
  /** Selecting mode dims whatever is not chosen. The spokes are drawn either way. */
  selecting: boolean;
  selected: readonly HubId[];
};

export function Orbit({ onAddPress, onHubPress, selecting, selected }: OrbitProps) {
  const { colors } = useTheme();
  /**
   * Top-level hubs only. Exercise's types and Labs are hubs too, but they belong inside their
   * parent — putting them on the ring would be the orbit claiming eleven domains instead of five.
   */
  const hubs = orbitHubs();
  /**
   * One more place than there are hubs: the last belongs to the `+`.
   *
   * The owner asked for it "in a bubble as one of the branches of the atoms", so it is a circle on
   * the ring with a spoke like any other — but it is deliberately NOT in `SEED_HUBS`. A row there
   * would give it a coach, a cockpit and a route. It is a place on the ring that is not a hub, and
   * the ring is the only thing that needs to know that.
   *
   * It sits last so that a hub the user adds lands before it and the seeded five never move.
   */
  const places = ringPlaceCount();
  /** Circles size themselves against how many there are. At seven this is still the full 32. */
  const radius = hubRadius(places);

  return (
    <View style={styles.stage}>
      {/* Always drawn, not only while selecting. The owner asked for every hub to be visibly
          connected to the Digital Twin at the centre, and that IS the claim the orbit makes: one
          twin, fed by every domain. Hiding the lines until a selection made the relationship
          something the screen only admitted to when asked. */}
      {Array.from({ length: places }, (_, index) => {
          const line = spoke(index, places);
          const id = index < hubs.length ? hubs[index].id : 'add';
          return (
            <View
              key={`spoke-${id}`}
              pointerEvents="none"
              style={[
                styles.spoke,
                {
                  left: line.left,
                  top: line.top,
                  transform: [{ rotate: line.rotate }],
                  width: line.length,
                },
                selecting && index < hubs.length && selected.includes(hubs[index].id)
                  ? { backgroundColor: colors.accent, opacity: 0.8 }
                  : { backgroundColor: colors.borderSubtle },
              ]}
            />
        );
      })}

      {hubs.map((hub, index) => {
        const position = hubCentre(index, places);
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
              {hub.ringLabel ?? hub.label}
            </Text>
          </Pressable>
        );
      })}

      {/* The `+`. Dashed rather than solid, because a circle that looks exactly like a hub but is
          not one is the kind of thing that gets tapped by mistake for a week. It dims and stops
          responding while coaches are being chosen: it has no coach to contribute, and navigating
          away mid-selection would throw the selection out.

          Known limit: React Native draws a dashed border as solid on Android when the corner
          radius is set, so on a phone this reads as a thin accent outline rather than a dash. The
          web preview — the surface anyone reviews — shows the dashes. Worth re-checking on the
          OnePlus rather than assuming it looks the same. */}
      <Pressable
        accessibilityLabel="Add a hub"
        accessibilityRole="button"
        disabled={selecting}
        onPress={onAddPress}
        style={({ pressed }) => {
          const position = hubCentre(hubs.length, places);
          return [
            styles.hub,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
              borderRadius: radius,
              borderStyle: 'dashed',
              borderWidth: 1,
              height: radius * 2,
              left: position.x - radius,
              top: position.y - radius,
              width: radius * 2,
            },
            selecting && styles.hubDimmed,
            pressed && styles.hubPressed,
          ];
        }}>
        <Text style={[styles.addGlyph, { color: colors.accent, fontSize: labelSize(radius) * 1.7 }]}>
          +
        </Text>
      </Pressable>
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
  addGlyph: {
    fontFamily: fontFamily.medium,
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

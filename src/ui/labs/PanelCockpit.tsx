import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { View } from 'react-native';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import type { HubEntry } from '@/core/hubs';
import { Period } from '@/ui/hubs/Period';
import { labsPeriods } from '@/ui/labs/cockpit';
import { useTheme } from '@/ui/theme';

/**
 * The Labs cockpit, from the panels actually on file.
 *
 * Loads and renders; what the rows SAY is decided in `cockpit.ts` and asserted in bare Node. Draws
 * through `Period`, the same component every other cockpit uses.
 *
 * Nothing at all until a panel exists — `PanelAge` above already explains an empty hub, and a
 * second block saying so is noise.
 */
export function PanelCockpit({ source = defaultHubs }: { source?: typeof defaultHubs }) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<readonly HubEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries('labs')
        .then((found) => {
          if (!cancelled) setEntries(found);
        })
        .catch(() => {
          // Nothing rather than a cockpit this cannot stand behind.
        });

      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  const periods = labsPeriods(entries, new Date().toISOString());
  if (periods.length === 0) return null;

  return (
    <View>
      {periods.map((period) => (
        <Fragment key={period.label}>
          <Period colors={colors} period={period} />
        </Fragment>
      ))}
    </View>
  );
}

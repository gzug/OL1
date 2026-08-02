import { useLocalSearchParams } from 'expo-router';

import { HUB_STATES } from '@/ui/hubs/fixtures';
import { NutritionHub } from '@/ui/hubs/NutritionHub';
import { HUBS } from '@/ui/mockup/fixtures';
import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { StubScreen } from '@/ui/mockup/StubScreen';

/**
 * A hub's front door: that hub's own state, never a chat. Nutrition is designed and built;
 * `docs/decisions/0004-nutrition-hub.md` argues what a hub state is, and why coverage stands in for
 * the score the spec rejected. The other five keep the stub until each is designed — a hub filled in
 * to look finished is the harder thing to correct later.
 */
export default function HubRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hub = HUBS.find((entry) => entry.id === id);
  const state = hub === undefined ? undefined : HUB_STATES[hub.id];

  return (
    <MockupScreen>
      {hub !== undefined && state !== undefined ? (
        <NutritionHub hub={hub} state={state} />
      ) : (
        <StubScreen
          detail="Its own state goes here. Chat is one step further in."
          title={hub?.label ?? 'Hub'}
        />
      )}
    </MockupScreen>
  );
}

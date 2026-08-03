import { useLocalSearchParams } from 'expo-router';

import { coachForHub, findHub } from '@/ui/hubs/catalog';
import { HubScreen } from '@/ui/hubs/HubScreen';
import { hubStateFor } from '@/ui/hubs/states';
import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { StubScreen } from '@/ui/mockup/StubScreen';

/**
 * A hub's front door: two doors, its coach and its cockpit, on one screen.
 *
 * `[id]` is any string, because hubs are data the user can add to. Two different misses are possible
 * and they say different things: an id that names no hub at all, and a hub that exists but has no
 * state written for it yet — which will be the normal case for every hub a user creates.
 */
export default function HubRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hub = findHub(id);
  const state = hub === undefined ? undefined : hubStateFor(hub.id);

  if (hub !== undefined && state !== undefined) {
    return (
      <MockupScreen>
        <HubScreen coach={coachForHub(hub.id)} hub={hub} state={state} />
      </MockupScreen>
    );
  }

  return (
    <MockupScreen>
      <StubScreen
        detail={
          hub === undefined
            ? 'No hub by that name.'
            : 'This hub has no cockpit yet. Its coach and its own state go here.'
        }
        title={hub?.label ?? 'Hub'}
      />
    </MockupScreen>
  );
}

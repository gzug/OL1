import { Redirect, useLocalSearchParams } from 'expo-router';

import { coachForHub, findHub, isDomainHub } from '@/ui/hubs/catalog';
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

  /**
   * The Open Table sits on the ring but is not a hub: it has no coach of its own and no cockpit,
   * because it is the way to reach every coach. Redirecting here rather than special-casing the
   * press handler means Home needs to know nothing about it — it taps a place on the ring like any
   * other, and the ring's own route decides what that place is.
   */
  if (hub !== undefined && !isDomainHub(hub)) {
    return <Redirect href="/table" />;
  }

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

import { Redirect, useLocalSearchParams } from 'expo-router';

import { coachForHub, findHub, isDomainHub } from '@/ui/hubs/catalog';
import { HubScreen } from '@/ui/hubs/HubScreen';
import { coachFor } from '@/ui/hubs/mergeHubs';
import { emptyHubState } from '@/ui/hubs/hubState';
import { hubStateFor } from '@/ui/hubs/states';
import { useHubs } from '@/ui/hubs/useHubs';
import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { StubScreen } from '@/ui/mockup/StubScreen';

/**
 * A hub's front door: two doors, its coach and its cockpit, on one screen.
 *
 * `[id]` is any string, because hubs are data the user can add to. Two different misses are possible
 * and they say different things: an id that names no hub at all, and a hub that exists but has no
 * state written for it yet — which is the normal case for every hub a user creates.
 *
 * The lookup goes through `useHubs`, not the catalog alone: a hub the user made has no row in
 * `SEED_HUBS`, so a catalog-only `findHub` would answer "no hub by that name" for the one hub they
 * definitely know exists.
 */
export default function HubRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hubs } = useHubs();
  const hub = findHub(id, hubs);

  /**
   * The Open Table sits on the ring but is not a hub: it has no coach of its own and no cockpit,
   * because it is the way to reach every coach. Redirecting here rather than special-casing the
   * press handler means Home needs to know nothing about it — it taps a place on the ring like any
   * other, and the ring's own route decides what that place is.
   */
  if (hub !== undefined && !isDomainHub(hub)) {
    return <Redirect href="/table" />;
  }

  if (hub === undefined) {
    return (
      <MockupScreen>
        <StubScreen detail="No hub by that name." title="Hub" />
      </MockupScreen>
    );
  }

  /**
   * **A hub somebody made gets the real screen, not a stub.**
   *
   * It used to render `StubScreen` saying "Its coach is here. Nothing has been recorded in this hub
   * yet." — **without reading the store.** Meanwhile the first-run flow files goals into exactly
   * these hubs and the Twin's ledger prints them, so the app showed a person their own goal on one
   * screen and denied it existed on another.
   *
   * `HubScreen` already renders everything that is real from the store — the entries, the week, the
   * chat bar — and `emptyHubState` gives it a state with no fixtures at all, so nothing below the
   * fold is invented and the sample-data marker correctly does not appear.
   */
  const state = hubStateFor(hub.id) ?? emptyHubState();

  return (
    <MockupScreen>
      <HubScreen coach={coachForHub(hub.id, hubs) ?? coachFor(hub)} hub={hub} state={state} />
    </MockupScreen>
  );
}

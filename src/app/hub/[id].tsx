import { useLocalSearchParams } from 'expo-router';

import { coachForHub, findHub } from '@/ui/hubs/catalog';
import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { StubScreen } from '@/ui/mockup/StubScreen';

/**
 * A hub's front door. Still a stub: the two doors a hub opens — its coach, and its cockpit — are
 * designed but not built yet, and a hub filled in to look finished is the harder thing to correct.
 *
 * `[id]` is now any string, because hubs are data the user can add to. An id that resolves to
 * nothing is therefore an ordinary state rather than an impossible one, and it says so plainly.
 */
export default function HubRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hub = findHub(id);
  const coach = hub === undefined ? undefined : coachForHub(hub.id);

  return (
    <MockupScreen>
      <StubScreen
        detail={
          hub === undefined
            ? 'No hub by that name.'
            : `Two doors go here: ${coach?.name ?? 'its coach'}, and this hub's cockpit.`
        }
        title={hub?.label ?? 'Hub'}
      />
    </MockupScreen>
  );
}

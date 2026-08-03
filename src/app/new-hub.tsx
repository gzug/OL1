import { useLocalSearchParams } from 'expo-router';

import { NewHubFlow } from '@/ui/hubs/NewHubFlow';
import { MockupScreen } from '@/ui/mockup/MockupScreen';

/**
 * Making a hub, or an exercise type inside one — the same flow, and `?parent=` is the difference.
 *
 * The route is `/new-hub` rather than `/hub/new` on purpose: a static segment beats a dynamic one in
 * expo-router, so `/hub/new` would permanently shadow any hub a user named "New". Keeping it out of
 * `hub/` means every id stays reachable.
 */
export default function NewHubRoute() {
  const { parent } = useLocalSearchParams<{ parent?: string }>();

  return (
    <MockupScreen>
      <NewHubFlow parentId={parent} />
    </MockupScreen>
  );
}

import { useLocalSearchParams } from 'expo-router';

import { coachForHub } from '@/ui/hubs/catalog';
import { ChatSurface } from '@/ui/chat/ChatSurface';
import { MockupScreen } from '@/ui/mockup/MockupScreen';

/**
 * The conversation.
 *
 * The route carries coach IDS and nothing else. What the person typed never travels here — the bar
 * on Home writes the question to the store and this screen picks it up, which keeps a health
 * question out of browser history and out of the host's access logs.
 *
 * Two parameters, on purpose. `?coaches=` is what the bar sends. `?domains=` is what a hub's coach
 * door sends — hub ids, not coach ids, and the two are not interchangeable: the Labs hub opens the
 * Longevity Guide. `coachForHub` is the catalog's own answer to that, so this route asks it rather
 * than assuming the ids match. Accepting both is also what keeps `HubScreen.tsx` working untouched.
 */
export default function TableRoute() {
  const { coaches, domains } = useLocalSearchParams<{ coaches?: string; domains?: string }>();

  const fromCoaches = split(coaches);
  const fromHubs = split(domains)
    .map((hubId) => coachForHub(hubId)?.id)
    .filter((id): id is string => id !== undefined);

  return (
    <MockupScreen>
      <ChatSurface coachIds={[...new Set([...fromCoaches, ...fromHubs])]} />
    </MockupScreen>
  );
}

function split(value: string | undefined): readonly string[] {
  return (value ?? '').split(',').filter((id) => id.length > 0);
}

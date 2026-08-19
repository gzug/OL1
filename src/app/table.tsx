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
 * Three parameters, each answering a different question. `?thread=` names the conversation and is
 * what the bar, the history list and a hub's recent three all send — it is the only one that can
 * tell two conversations with the same coach apart. `?coaches=` names who is at the table without
 * saying which conversation, which is all an older link can say; the surface then opens their most
 * recent, or starts one. `?domains=` is what a hub's coach door sends — hub ids, not coach ids, and
 * the two are not interchangeable: the Labs hub opens the Longevity Guide, and `coachForHub` is the
 * catalog's own answer to that rather than an assumption that the ids match.
 */
export default function TableRoute() {
  const { coaches, domains, thread } = useLocalSearchParams<{
    coaches?: string;
    domains?: string;
    thread?: string;
  }>();

  const fromCoaches = split(coaches);
  const fromHubs = split(domains)
    .map((hubId) => coachForHub(hubId)?.id)
    .filter((id): id is string => id !== undefined);

  return (
    <MockupScreen>
      <ChatSurface
        coachIds={[...new Set([...fromCoaches, ...fromHubs])]}
        threadId={thread ?? null}
      />
    </MockupScreen>
  );
}

function split(value: string | undefined): readonly string[] {
  return (value ?? '').split(',').filter((id) => id.length > 0);
}

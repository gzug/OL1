import { useLocalSearchParams } from 'expo-router';

import { HUBS } from '@/ui/mockup/fixtures';
import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { StubScreen } from '@/ui/mockup/StubScreen';

/**
 * A hub's front door. It is a stub rather than a chat on purpose: what belongs here is that hub's
 * own state, and chat is one step further in. Deciding what the state shows is still open.
 */
export default function HubRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const label = HUBS.find((hub) => hub.id === id)?.label ?? 'Hub';

  return (
    <MockupScreen>
      <StubScreen detail="Its own state goes here. Chat is one step further in." title={label} />
    </MockupScreen>
  );
}

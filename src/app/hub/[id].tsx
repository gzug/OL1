import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HUBS } from '@/ui/mockup/fixtures';
import { MockupFrame } from '@/ui/mockup/MockupFrame';
import { StubScreen } from '@/ui/mockup/StubScreen';
import { color } from '@/ui/mockup/tokens';

/**
 * A hub's front door. It is a stub rather than a chat on purpose: what belongs here is that hub's
 * own state, and chat is one step further in. Deciding what the state shows is still open.
 */
export default function HubRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const label = HUBS.find((hub) => hub.id === id)?.label ?? 'Hub';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ backgroundColor: color.background, flex: 1 }}>
      <MockupFrame>
        <StubScreen detail="Its own state goes here. Chat is one step further in." title={label} />
      </MockupFrame>
    </SafeAreaView>
  );
}

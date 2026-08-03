import { useLocalSearchParams } from 'expo-router';

import { findHub } from '@/ui/hubs/catalog';
import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { StubScreen } from '@/ui/mockup/StubScreen';

/**
 * The stub names the domains it was handed. That is the whole point of the route: it proves the
 * Open Table opens ONE chat carrying every selected hub, without building a chat to prove it.
 */
export default function TableRoute() {
  const { domains } = useLocalSearchParams<{ domains?: string }>();
  const names = (domains ?? '')
    .split(',')
    .map((id) => findHub(id)?.label)
    .filter((label): label is string => label !== undefined);

  return (
    <MockupScreen>
      <StubScreen
        detail={names.length > 0 ? `One chat, carrying ${names.join(', ')}` : undefined}
        title="Open Table"
      />
    </MockupScreen>
  );
}

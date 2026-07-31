import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HUBS } from '@/ui/mockup/fixtures';
import { MockupFrame } from '@/ui/mockup/MockupFrame';
import { StubScreen } from '@/ui/mockup/StubScreen';
import { color } from '@/ui/mockup/tokens';

/**
 * The stub names the domains it was handed. That is the whole point of the route: it proves the
 * Open Table opens ONE chat carrying every selected hub, without building a chat to prove it.
 */
export default function TableRoute() {
  const { domains } = useLocalSearchParams<{ domains?: string }>();
  const names = (domains ?? '')
    .split(',')
    .map((id) => HUBS.find((hub) => hub.id === id)?.label)
    .filter((label): label is string => label !== undefined);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ backgroundColor: color.background, flex: 1 }}>
      <MockupFrame>
        <StubScreen
          detail={names.length > 0 ? `One chat, carrying ${names.join(', ')}` : undefined}
          title="Open Table"
        />
      </MockupFrame>
    </SafeAreaView>
  );
}

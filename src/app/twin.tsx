import { SafeAreaView } from 'react-native-safe-area-context';

import { MockupFrame } from '@/ui/mockup/MockupFrame';
import { TwinMockup } from '@/ui/mockup/TwinMockup';
import { color } from '@/ui/mockup/tokens';

export default function TwinRoute() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ backgroundColor: color.background, flex: 1 }}>
      <MockupFrame>
        <TwinMockup />
      </MockupFrame>
    </SafeAreaView>
  );
}

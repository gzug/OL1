import { HomeMockup } from '@/ui/mockup/HomeMockup';
import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { FirstRunGate } from '@/ui/onboarding/FirstRunGate';

export default function HomeRoute() {
  return (
    <MockupScreen>
      <FirstRunGate />
      <HomeMockup />
    </MockupScreen>
  );
}

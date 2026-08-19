import { LogSessionFlow } from '@/ui/exercise/LogSessionFlow';
import { MockupScreen } from '@/ui/mockup/MockupScreen';

/**
 * A top-level route for the same reason `/log-meal`, `/add-panel` and `/new-hub` are: a static
 * segment beats a dynamic one in expo-router's matching, and `/hub/exercise/log` would compete with
 * `/hub/[id]`.
 */
export default function LogSessionRoute() {
  return (
    <MockupScreen>
      <LogSessionFlow />
    </MockupScreen>
  );
}

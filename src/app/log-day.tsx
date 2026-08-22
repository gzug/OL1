import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { LogDayFlow } from '@/ui/resilience/LogDayFlow';

/**
 * A top-level route, for the same reason `/log-night` and `/log-session` are: a static segment beats
 * a dynamic one in expo-router's matching, and `/hub/resilience/log` would compete with `/hub/[id]`.
 */
export default function LogDayRoute() {
  return (
    <MockupScreen>
      <LogDayFlow />
    </MockupScreen>
  );
}

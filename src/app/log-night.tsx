import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { LogNightFlow } from '@/ui/sleep/LogNightFlow';

/**
 * A top-level route, for the same reason `/log-session` and `/log-meal` are: a static segment beats
 * a dynamic one in expo-router's matching, and `/hub/sleep/log` would compete with `/hub/[id]`.
 */
export default function LogNightRoute() {
  return (
    <MockupScreen>
      <LogNightFlow />
    </MockupScreen>
  );
}

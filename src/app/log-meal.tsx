import { LogMealFlow } from '@/ui/meals/LogMealFlow';
import { MockupScreen } from '@/ui/mockup/MockupScreen';

/**
 * Logging a meal: photo, camera roll, or described — all three ending in the same review step.
 *
 * A top-level route for the same reason `/add-panel` and `/new-hub` are: a static segment beats a
 * dynamic one in expo-router, so anything under `hub/` risks shadowing a hub id a user could create.
 */
export default function LogMealRoute() {
  return (
    <MockupScreen>
      <LogMealFlow />
    </MockupScreen>
  );
}

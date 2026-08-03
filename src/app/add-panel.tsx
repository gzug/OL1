import { LabUploadFlow } from '@/ui/labs/LabUploadFlow';
import { MockupScreen } from '@/ui/mockup/MockupScreen';

/**
 * Adding a lab panel: photo, file, or by hand — all three ending in the same review table.
 *
 * A top-level route rather than `/hub/labs/add`, for the same reason `/new-hub` is not `/hub/new`:
 * a static segment beats a dynamic one in expo-router, so anything under `hub/` risks shadowing a
 * hub id the user could create.
 */
export default function AddPanelRoute() {
  return (
    <MockupScreen>
      <LabUploadFlow />
    </MockupScreen>
  );
}

import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { LogRecordFlow } from '@/ui/medical/LogRecordFlow';

/** A top-level route, for the same reason `/log-night` and `/log-day` are. */
export default function MedicationRoute() {
  return (
    <MockupScreen>
      <LogRecordFlow kind="medication" />
    </MockupScreen>
  );
}

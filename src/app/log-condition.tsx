import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { LogRecordFlow } from '@/ui/medical/LogRecordFlow';

/** A top-level route, for the same reason `/log-night` and `/log-day` are. */
export default function ConditionRoute() {
  return (
    <MockupScreen>
      <LogRecordFlow kind="condition" />
    </MockupScreen>
  );
}

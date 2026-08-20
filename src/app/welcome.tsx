import { FirstRunFlow } from '@/ui/onboarding/FirstRunFlow';
import { MockupScreen } from '@/ui/mockup/MockupScreen';

/**
 * The first run, as a route of its own rather than a mode Home can be in.
 *
 * Being addressable is the point. `FirstRunGate` sends a new person here, and anyone can open
 * `/welcome` afterwards to walk it again — which is also how it gets reviewed on the preview,
 * without having to clear a browser's data to see it.
 *
 * A static segment, so `cleanUrls` in `vercel.json` serves it and `tests/web-routes.test.ts` needs
 * no rewrite; only dynamic routes need one of those.
 */
export default function WelcomeRoute() {
  return (
    <MockupScreen>
      <FirstRunFlow />
    </MockupScreen>
  );
}

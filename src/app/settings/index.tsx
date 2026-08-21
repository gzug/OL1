import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { SettingsIndex } from '@/ui/settings/SettingsIndex';

/**
 * Settings, as a route of its own rather than a panel Home owns.
 *
 * The conversation drawer's gear opens this. Everything under `/settings/` is a static segment, so
 * `cleanUrls` in `vercel.json` serves each one and `tests/web-routes.test.ts` needs no rewrite —
 * only dynamic routes need one of those.
 */
export default function SettingsRoute() {
  return (
    <MockupScreen>
      <SettingsIndex />
    </MockupScreen>
  );
}

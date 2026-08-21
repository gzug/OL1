import { MockupScreen } from '@/ui/mockup/MockupScreen';
import { SettingsScreen } from '@/ui/settings/SettingsScreen';

/**
 * Settings, as a route of its own rather than a panel Home owns.
 *
 * The conversation drawer being built in a parallel session carries a gear at its foot, and this is
 * what that gear opens. Building it as an addressable route means neither side has to wait for the
 * other: it is reviewable on the preview at `/settings` today, and wiring the gear is one `href`
 * when the drawer lands.
 *
 * A static segment, so `cleanUrls` in `vercel.json` serves it and `tests/web-routes.test.ts` needs
 * no rewrite — only dynamic routes need one of those.
 */
export default function SettingsRoute() {
  return (
    <MockupScreen>
      <SettingsScreen />
    </MockupScreen>
  );
}

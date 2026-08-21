import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { Group, Note, Row, Screen } from './chrome';
import {
  AboutIcon,
  CoachesIcon,
  ContactIcon,
  FeedbackIcon,
  GoalsIcon,
  HubsIcon,
  NotificationsIcon,
  OnboardingIcon,
  PrivacyIcon,
  ProfileIcon,
  SubscriptionIcon,
} from './icons';
import { COPY, ROWS, groups, rowsIn, subtitles, type RowId } from './rows';
import { factsFrom, useSettings } from './useSettings';

/**
 * Settings.
 *
 * **Nothing lives on this screen except the way in.** Eleven rows in the owner's three groups, each
 * opening its own screen — his call on 2026-08-21, once it became clear that a subscription layer
 * and everything around it could not sit on one scrolling page.
 *
 * **Three rows are waiting on something that does not exist yet**, and they are here anyway, marked.
 * A person seeing where plans will live beats plans appearing one day where nobody expects them.
 * What a waiting row must never do is look available: Legacy shipped a wearable row badged
 * `Connected ✓` with no wearable behind it, and that is what `docs/decisions/0013` is about.
 *
 * **The line under each row disappears until the store has answered.** Not a blank, not a zero —
 * absent. `subtitles(null)` is where that rule lives, so it is one function rather than eleven
 * components remembering it.
 */

/**
 * Icons by row id.
 *
 * `Record<RowId, …>` rather than `Record<string, …>`: a row added to `rows.ts` without an icon is a
 * type error here, instead of a row that renders with an empty space where every other row has a
 * picture. The switch below is checked the same way.
 */
const ICONS: Readonly<Record<RowId, (props: { muted?: boolean }) => ReactNode>> = {
  about: AboutIcon,
  coaches: CoachesIcon,
  contact: ContactIcon,
  feedback: FeedbackIcon,
  goals: GoalsIcon,
  hubs: HubsIcon,
  notifications: NotificationsIcon,
  onboarding: OnboardingIcon,
  privacy: PrivacyIcon,
  profile: ProfileIcon,
  subscription: SubscriptionIcon,
};

export function SettingsIndex() {
  const router = useRouter();
  const { data } = useSettings();

  const facts = data.status === 'ready' ? factsFrom(data.value, new Date()) : null;
  const under = subtitles(facts);

  /**
   * Every destination is a literal, and that is not a style preference.
   *
   * `typedRoutes` can only check a route it can see written down. An `href: string` carried on the
   * row list would have made all eleven unverifiable in one move — the same trade `FirstRunFlow`
   * refused, for the same reason. A switch is more lines and every line is checked.
   */
  function open(id: RowId): void {
    switch (id) {
      case 'about':
        return router.push('/settings/about');
      case 'coaches':
        return router.push('/settings/coaches');
      case 'contact':
        return router.push('/settings/contact');
      case 'feedback':
        return router.push('/settings/feedback');
      case 'goals':
        return router.push('/settings/goals');
      case 'hubs':
        return router.push('/settings/hubs');
      case 'notifications':
        return router.push('/settings/notifications');
      case 'onboarding':
        return router.push('/welcome');
      case 'privacy':
        return router.push('/settings/privacy');
      case 'profile':
        return router.push('/settings/profile');
      case 'subscription':
        return router.push('/settings/subscription');
    }
  }

  return (
    <Screen title={COPY.title}>
      {groups(ROWS).map((group) => (
        <Group key={group} label={group}>
          {rowsIn(group).map((row) => {
            const Icon = ICONS[row.id];
            const waiting = row.state === 'waiting';
            return (
              <Row
                icon={<Icon muted={waiting} />}
                key={row.id}
                label={row.label}
                onPress={() => open(row.id)}
                under={under[row.id]}
                waiting={waiting}
              />
            );
          })}
        </Group>
      ))}

      {/* A claim about the app, not about the person — so it is safe to show when a read fails. */}
      {data.status === 'failed' && <Note text={COPY.unread} />}
    </Screen>
  );
}

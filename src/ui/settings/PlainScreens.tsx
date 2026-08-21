import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { COPY as FIRST_RUN } from '@/ui/onboarding/firstRun';

import { Label, Note, Screen, Waiting } from './chrome';
import {
  ContactIcon,
  FeedbackIcon,
  NotificationsIcon,
  PrivacyIcon,
  SubscriptionIcon,
} from './icons';
import { COPY } from './rows';

/**
 * The screens made of nothing but words.
 *
 * Six of them, together, because each is a heading and a paragraph and six files of that would be
 * five more places for the frame to drift. Anything that grows a control moves out to its own file.
 *
 * **Four of these are rows that are waiting on something that does not exist.** They are reachable
 * on purpose: a person tapping *Subscription* should find out why there is nothing there rather than
 * meet a dead row. Each says what is missing in terms of the thing itself — no server, no plans,
 * nothing sent — and never a date, because a date is a promise nobody has made.
 */

export function ContactScreen() {
  return (
    <Screen title={COPY.contactTitle}>
      <Waiting
        icon={<ContactIcon size={30} muted />}
        text={COPY.contactWaiting}
        title="One L1fe has no accounts"
      />
    </Screen>
  );
}

export function SubscriptionScreen() {
  return (
    <Screen title={COPY.subscriptionTitle}>
      <Waiting
        icon={<SubscriptionIcon size={30} muted />}
        text={COPY.subscriptionWaiting}
        title="Nothing to pay for yet"
      />
    </Screen>
  );
}

export function NotificationsScreen() {
  return (
    <Screen title={COPY.notificationsTitle}>
      <Waiting
        icon={<NotificationsIcon size={30} muted />}
        text={COPY.notificationsWaiting}
        title="Nothing is sent"
      />
    </Screen>
  );
}

/**
 * The cheapest thing on the whole list, and it is still waiting — on an address.
 *
 * Opening a mail app is two lines. Guessing which address to open it with is not something a screen
 * should do, and shipping the wrong one would send somebody's feedback nowhere while looking like it
 * worked. So it says what it needs.
 */
export function FeedbackScreen() {
  return (
    <Screen title={COPY.feedbackTitle}>
      <Waiting
        icon={<FeedbackIcon size={30} muted />}
        text={COPY.feedbackWaiting}
        title="No address yet"
      />
    </Screen>
  );
}

/**
 * Privacy — where your data actually lives.
 *
 * **The sentence differs by surface because the truth does.** On the web preview this is a browser
 * store that goes when the browser's data is cleared; on a phone it is a file on that phone. Legacy
 * shipped one sentence for both — *"All data stays on your device and remains local"* — while its
 * own cloud calls said otherwise, and that was finding #3 of its audit.
 */
export function PrivacyScreen() {
  return (
    <Screen title={COPY.privacyTitle}>
      <Label text="WHERE IT IS" />
      <Note text={Platform.OS === 'web' ? FIRST_RUN.storageWeb : FIRST_RUN.storageNative} />
      <Note text={FIRST_RUN.noAccount} />

      <Label text="WHAT IS KEPT" />
      <Note text="Everything you have told One L1fe, and everything you have logged. Nothing here is ever deleted — a hub you put away keeps every entry it held, and a goal you turn off is recorded as changed rather than erased." />

      <Label text="WHAT LEAVES" />
      <Note text="Nothing, today. When a coach answers you, the question you typed and what you have told that coach are sent to the model that answers it. Your logged measurements are not." />
    </Screen>
  );
}

export function AboutScreen() {
  /** From the app config rather than typed here, so it cannot drift from what was actually built. */
  const version = Constants.expoConfig?.version ?? null;

  return (
    <Screen title={COPY.aboutTitle}>
      <Label text="WHAT IT IS" />
      <Note text={COPY.aboutWhat} />

      {version !== null && (
        <>
          <Label text="VERSION" />
          <Note text={version} />
        </>
      )}
    </Screen>
  );
}

/**
 * What is on the settings index, and every sentence it says. No React in it.
 *
 * Same split and the same reasons as `firstRun.ts`: a judgement made inside a component is a
 * judgement nothing can assert in bare Node, and copy in a `.ts` keeps apostrophes out of the lint
 * rule that rejects a straight quote in JSX text.
 *
 * **The owner's structure, settled 2026-08-21.** Three groups, eleven doors, and nothing on the
 * index itself except the way in. Three things he decided along the way are load-bearing here:
 *
 * - **Memory is not a row.** It was, and he removed it: people relate to Profile, Goals, Hubs and
 *   Coaches, which are things they can point at. Memory was the abstraction over them, and the
 *   coaches row is where what-the-app-knows actually became visible.
 * - **Account splits in two**, because Profile already holds personal information. The line: a
 *   profile is about your body, because the app reasons with it; an account is about you as a
 *   customer. Same kind of fact, two different reasons for holding it.
 * - **Four rows are waiting on something that does not exist**, and they stay, marked. A person
 *   seeing where plans will live beats plans appearing one day where nobody expects them. What a
 *   waiting row must never do is look available — Legacy shipped a wearable row badged
 *   `Connected ✓` with no wearable behind it, and that is the whole of `docs/decisions/0013`.
 */

import type { Sex } from '@/core/profile';


/**
 * Whether a row leads anywhere yet.
 *
 * `waiting` is not a disabled state — the row opens, and what it opens says plainly what it is
 * waiting for. A row that did nothing at all would be worse than one that explains itself.
 */
export type RowState = 'ready' | 'waiting';

export type GroupName = 'My One L1fe' | 'Account' | 'General';

/**
 * Every row, as a type.
 *
 * **This is a guard, not a tidiness.** The index maps an id to an icon and to a route, and both are
 * `Record<RowId, …>` — so adding a row here and forgetting either one is a type error rather than a
 * row that renders with no icon, or worse, one that does nothing when tapped. A `string` id would
 * have made both silent.
 */
export type RowId =
  | 'about'
  | 'coaches'
  | 'contact'
  | 'feedback'
  | 'goals'
  | 'hubs'
  | 'notifications'
  | 'onboarding'
  | 'privacy'
  | 'profile'
  | 'subscription';

export type SettingsRow = {
  readonly group: GroupName;
  /** Also the key into `subtitles`. Never a route — see the note on navigation below. */
  readonly id: RowId;
  readonly label: string;
  readonly state: RowState;
};

/**
 * The rows, in order, grouped.
 *
 * **No route lives here, deliberately.** `typedRoutes` can only check a destination it can see as a
 * literal, so an `href: string` on this list would make all eleven unverifiable in one move —
 * exactly the trade `FirstRunFlow` refused for the same reason. The index maps an id to a literal
 * at the call site instead.
 */
export const ROWS: readonly SettingsRow[] = [
  { group: 'My One L1fe', id: 'profile', label: 'Profile', state: 'ready' },
  { group: 'My One L1fe', id: 'goals', label: 'Goals', state: 'ready' },
  { group: 'My One L1fe', id: 'hubs', label: 'Hubs', state: 'ready' },
  { group: 'My One L1fe', id: 'coaches', label: 'Coaches', state: 'ready' },

  { group: 'Account', id: 'contact', label: 'Email and phone', state: 'waiting' },
  { group: 'Account', id: 'subscription', label: 'Subscription', state: 'waiting' },

  { group: 'General', id: 'onboarding', label: 'Onboarding', state: 'ready' },
  { group: 'General', id: 'notifications', label: 'Notifications', state: 'waiting' },
  { group: 'General', id: 'privacy', label: 'Privacy', state: 'ready' },
  { group: 'General', id: 'feedback', label: 'Give feedback', state: 'waiting' },
  { group: 'General', id: 'about', label: 'About', state: 'ready' },
];

/** The groups in order, derived rather than listed, so the two can never disagree. */
export function groups(rows: readonly SettingsRow[] = ROWS): readonly GroupName[] {
  const seen: GroupName[] = [];
  for (const row of rows) if (!seen.includes(row.group)) seen.push(row.group);
  return seen;
}

export function rowsIn(group: GroupName, rows: readonly SettingsRow[] = ROWS): readonly SettingsRow[] {
  return rows.filter((row) => row.group === group);
}

/* ── What each row says underneath its name ────────────────────────────────────────────────── */

/**
 * Everything the index needs to describe itself, and nothing else.
 *
 * Flat and already computed, so `subtitles` is arithmetic on plain values rather than a second
 * reader of the store. The screen loads; this decides what may be said about what was loaded.
 */
export type IndexFacts = {
  readonly coachesTold: number;
  readonly coachesTotal: number;
  /** The goals held right now, in the order they were first named. */
  readonly goals: readonly string[];
  readonly hubsAway: number;
  readonly hubsOnRing: number;
  /** `null` when nobody has ever answered. Distinct from a failed read — see below. */
  readonly profile: { readonly age: number | null; readonly heightCm: number | null; readonly sex: Sex } | null;
  readonly sports: readonly string[];
};

const SEX_WORDS: Readonly<Record<Sex, string>> = {
  female: 'female figure',
  male: 'male figure',
  other: 'figure not drawn yet',
  preferNotToSay: 'figure not drawn yet',
};

/**
 * The line under each row's name, or null for no line at all.
 *
 * **`facts` is null before the store has answered, and after it has failed.** Every subtitle is
 * then null, and the index renders names with nothing under them. That is the rule from
 * `docs/decisions/0013`, shape 1: a subtitle reading *6 hubs · 1 put away* drawn from a read that
 * never happened is a claim about somebody's data invented by a database error. Silence is the only
 * honest thing a screen can say before it has looked.
 *
 * A row that is `waiting` gets a fixed line instead, because that line is about the app rather than
 * about the person and is true whether or not anything was read.
 */
export function subtitles(facts: IndexFacts | null): Readonly<Record<RowId, string | null>> {
  const fixed = {
    about: COPY.aboutUnder,
    contact: COPY.contactUnder,
    feedback: COPY.feedbackUnder,
    notifications: COPY.notificationsUnder,
    onboarding: COPY.onboardingUnder,
    privacy: COPY.privacyUnder,
    subscription: COPY.subscriptionUnder,
  } as const;

  if (facts === null) {
    return { ...fixed, coaches: null, goals: null, hubs: null, profile: null };
  }

  return {
    ...fixed,
    coaches: coachesLine(facts),
    goals: goalsLine(facts),
    hubs: hubsLine(facts),
    profile: profileLine(facts),
  };
}

/** Only what was actually given. A skipped answer contributes nothing rather than a placeholder. */
function profileLine(facts: IndexFacts): string | null {
  const stored = facts.profile;
  if (stored === null) return COPY.profileEmpty;

  const parts = [
    stored.age === null ? null : `${stored.age}`,
    stored.heightCm === null ? null : `${stored.heightCm} cm`,
    SEX_WORDS[stored.sex],
  ].filter((part): part is string => part !== null);

  return parts.length === 1 && stored.age === null && stored.heightCm === null
    ? COPY.profileEmpty
    : parts.join(' · ');
}

function goalsLine(facts: IndexFacts): string {
  return facts.goals.length === 0 ? COPY.goalsEmpty : facts.goals.join(' · ');
}

function hubsLine(facts: IndexFacts): string {
  const ring = `${facts.hubsOnRing} on your ring`;
  return facts.hubsAway === 0 ? ring : `${ring} · ${facts.hubsAway} put away`;
}

function coachesLine(facts: IndexFacts): string {
  return facts.coachesTold === 0
    ? COPY.coachesEmpty
    : `${facts.coachesTold} of ${facts.coachesTotal} told how to work with you`;
}

/* ── Copy ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * Every sentence on the index and on the screens that hold nothing but words.
 *
 * The ones worth reading twice are the three `waiting` explanations. Each names what is missing in
 * terms of the thing itself — no server, no plans, nothing sent — rather than a date or a promise,
 * because a date is a claim nobody can keep and this repository has a guard against exactly that
 * shape of sentence.
 */
export const COPY = {
  aboutTitle: 'About',
  aboutUnder: 'What One L1fe is, and which version this is',
  /** The one place the abbreviation is allowed: it is the repository, and About says so. */
  aboutWhat:
    'One L1fe is a health app for one person. Everything you give it stays where you are — there is no account, no server, and nothing is sent anywhere. It is built in the open at github.com/gzug/OL1.',

  coachesEmpty: 'None told how to work with you yet',
  coachesHint:
    'What you tell a coach here shapes how it answers you. It is your own words, and nothing reads it back as a health record.',
  coachesTitle: 'Coaches',

  contactTitle: 'Email and phone',
  contactUnder: 'How One L1fe would reach you',
  contactWaiting:
    'One L1fe has no accounts and no server, so there is nowhere to send an email and nothing to attach a phone number to. Everything you have given it is on this device.',

  feedbackTitle: 'Give feedback',
  feedbackUnder: 'Nowhere to send it yet',
  /**
   * **It does not say "coming soon", and the owner asked for exactly that.**
   *
   * A test two files away asserts that no waiting line here says *soon* — a promise with the number
   * taken out is still a promise, and nobody has made one. So the screen says the true thing
   * instead: there is nowhere to send it. It reads as more finished than a placeholder anyway,
   * because it explains itself rather than apologising.
   */
  feedbackWaiting:
    'This will open your mail app with the address already in it. There is no address to send to yet, and an address that went nowhere would be worse than waiting for a real one.',

  goalsAdd: 'Add a goal',
  goalsEmpty: 'None set',
  goalsHint: 'What you are trying to get out of this. Each one lands in the part of the app that covers it.',
  goalsOwn: 'SOMETHING ELSE',
  goalsRemove: 'Remove',
  goalsTitle: 'Goals',
  goalsYours: 'WHAT YOU WANT',

  hubsHint: 'What is on your ring. Putting one away keeps everything in it.',
  hubsTitle: 'Hubs',

  notificationsTitle: 'Notifications',
  notificationsUnder: 'One L1fe sends none yet',
  notificationsWaiting:
    'One L1fe sends nothing — no reminders, no summaries, no email. When it does, the first will be a morning brief and an evening resume, and they will be switched off until you ask for them.',

  onboardingUnder: 'Walk the questions again',

  privacyTitle: 'Privacy',
  privacyUnder: 'Where your data actually lives',

  profileEmpty: 'Nothing given yet',
  profileTitle: 'Profile',

  saveFailed: 'That did not save, so nothing changed. Try again.',

  subscriptionTitle: 'Subscription',
  subscriptionUnder: 'Plans and billing',
  subscriptionWaiting:
    'Every part of One L1fe is open, because there is nothing behind a paywall. When there are plans, this is where they live.',

  title: 'Settings',
  /** Shown in place of everything, when the store answered and the answer was an error. */
  unread: 'One L1fe could not read that. Nothing is lost — try opening this screen again.',
  waitingBadge: 'Not yet',
} as const;

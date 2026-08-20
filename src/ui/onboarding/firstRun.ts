/**
 * Everything the first run decides, with no React in it.
 *
 * Pure and separate from the screens for the reason this repository keeps repeating: a judgement
 * made inside a component is a judgement nothing can assert in bare Node. `newHub.ts`, `levine.ts`
 * and `geometry.ts` are split the same way. `tests/first-run.test.ts` imports this and nothing else.
 *
 * **The copy lives here too**, which is less obvious. Two reasons. A sentence that makes a claim
 * about where data goes is a decision, not decoration, and it should be asserted rather than
 * proof-read. And rendering it as `{COPY.x}` instead of as bare JSX text keeps every apostrophe out
 * of the lint rule that rejects a straight quote in a JSX text node.
 */

import type { Profile, Sex } from '@/core/profile';

/** The six beats, in order. `ring` is last so it reads as the payoff of `goals` and `training`. */
export const STEPS = ['welcome', 'about', 'goals', 'training', 'records', 'ring'] as const;

export type Step = (typeof STEPS)[number];

export function nextStep(step: Step): Step | null {
  const index = STEPS.indexOf(step);
  return index === STEPS.length - 1 ? null : (STEPS[index + 1] ?? null);
}

export function previousStep(step: Step): Step | null {
  const index = STEPS.indexOf(step);
  return index <= 0 ? null : (STEPS[index - 1] ?? null);
}

/**
 * Whether to show the flow at all.
 *
 * A profile that has never been written is the whole test. There is deliberately no `hasOnboarded`
 * flag: a second thing to keep in sync is a second thing that can disagree, and the question "has
 * this person ever told us anything" already has an answer in the store.
 */
export function needsFirstRun(profile: Profile | null): boolean {
  return profile === null;
}

/**
 * What skipping writes.
 *
 * Skipping is an ANSWER, not an absence. `preferNotToSay` is a real member of `Sex` that means
 * exactly "not answered", and a null birth year means the age calculation returns null rather than
 * a number built on a guess. Writing it is what stops the welcome ambushing somebody on every
 * launch — and it records only what is true, which a `hasOnboarded` flag would not.
 */
export const SKIPPED: { readonly birthYear: null; readonly sex: Sex } = {
  birthYear: null,
  sex: 'preferNotToSay',
};

export type Choice = {
  /** The hub this lands in when one already ships for it. Absent means it creates one. */
  readonly hubId?: string;
  readonly id: string;
  readonly label: string;
};

/**
 * The goals, and where each one already lives.
 *
 * Every one of these maps onto a hub that ships on the ring today, which is the finding that
 * changed this screen: "pick a goal, it creates the hub" would create nothing. So a goal RECORDS
 * itself in the hub it belongs to, and the creation path belongs to the free-text answer below —
 * where it actually fires. A branch that can never be taken is not a feature, it is dead code that
 * reads like one.
 */
export const GOALS: readonly Choice[] = [
  { hubId: 'sleep', id: 'sleep', label: 'Sleep better' },
  { hubId: 'exercise', id: 'fitness', label: 'Get fitter' },
  { hubId: 'resilience', id: 'stress', label: 'Handle stress' },
  { hubId: 'resilience', id: 'energy', label: 'More energy' },
  { hubId: 'nutrition', id: 'body', label: 'Body composition' },
  { hubId: 'labs', id: 'longevity', label: 'Live longer' },
  { hubId: 'labs', id: 'metabolic', label: 'Metabolic health' },
];

/**
 * The sports that already ship as hubs inside Exercise.
 *
 * Tapping one of these records it; typing anything else CREATES a hub under Exercise with its own
 * coach, which is the same thing the `+` button does and the same code path — `newHub.ts` sets a
 * new hub's `coachId` to its own id, so a new sport arrives with a coach attached.
 */
export const SPORTS: readonly Choice[] = [
  { hubId: 'running', id: 'running', label: 'Running' },
  { hubId: 'gym', id: 'gym', label: 'Gym' },
  { hubId: 'cycling', id: 'cycling', label: 'Cycling' },
  { hubId: 'swimming', id: 'swimming', label: 'Swimming' },
  { hubId: 'golf', id: 'golf', label: 'Golf' },
];

export type RecordKind = {
  readonly id: string;
  readonly label: string;
  /** What happens when it is tapped, and the only honest difference between the three. */
  readonly readable: boolean;
  readonly note: string;
};

/**
 * What somebody may already have, and which of it this app can actually read.
 *
 * The blood panel is live: nine named markers with known units feeding a published formula, which
 * is precisely why its import works. A microbiome report is a taxonomic abundance table of hundreds
 * of species and a genetic export is hundreds of thousands of rows — there is no nine-row table to
 * fill and nothing here consumes either. So they are shown, and they say so. A button that accepted
 * a file nothing could read would be Legacy audit finding #2 rebuilt on purpose.
 */
export const RECORD_KINDS: readonly RecordKind[] = [
  {
    id: 'panel',
    label: 'Blood panel',
    note: 'Goes straight in. It is what the biological age is calculated from.',
    readable: true,
  },
  {
    id: 'microbiome',
    label: 'Microbiome test',
    note: 'Noted, not read. OL1 cannot make sense of one yet.',
    readable: false,
  },
  {
    id: 'genetics',
    label: 'Genetic test',
    note: 'Noted, not read. OL1 cannot make sense of one yet.',
    readable: false,
  },
];

export type Gap = { readonly cause: string; readonly subject: string };

/**
 * What the app still cannot tell you, and why.
 *
 * The owner rejected a completeness percentage for this. A weighted score across layers that do not
 * exist — DNA and microbiome were to contribute a tenth of it — is invented precision presented as
 * measurement, which is the same class of error as Legacy's hardcoded 41.6. Every line here names a
 * subject and a true cause, which is the rule the first-run audit ended on.
 *
 * It returns an empty list when nothing is missing, and the screen says so rather than inventing a
 * gap to fill the space.
 */
export function stillMissing(answers: {
  readonly birthYear: number | null;
  readonly heldUnreadable: readonly string[];
  readonly panelComing: boolean;
}): readonly Gap[] {
  const gaps: Gap[] = [];

  if (answers.birthYear === null && !answers.panelComing) {
    gaps.push({
      cause: 'Needs your year of birth and a blood panel. You have given neither yet.',
      subject: 'Biological age',
    });
  } else if (answers.birthYear === null) {
    gaps.push({
      cause: 'Needs your year of birth. The panel alone is not enough to work an age against.',
      subject: 'Biological age',
    });
  } else if (!answers.panelComing) {
    gaps.push({
      cause: 'Needs a blood panel. Your year of birth is in.',
      subject: 'Biological age',
    });
  }

  for (const id of answers.heldUnreadable) {
    const kind = RECORD_KINDS.find((entry) => entry.id === id);
    if (kind !== undefined) {
      gaps.push({
        cause: 'Recorded, so we know to ask for it. Nothing here can read one yet.',
        subject: kind.label,
      });
    }
  }

  return gaps;
}

/**
 * Every user-facing sentence in the flow.
 *
 * The storage line is the one worth reading twice. Legacy's first-run audit found a privacy
 * subtitle that was simply false, and the fix was fewer words that were true rather than more
 * words that were reassuring. On the web preview this is a browser store and it is not durable
 * storage for health data; saying anything warmer than that would repeat the exact failure.
 */
export const COPY = {
  aboutHint:
    'Three things, and you can skip any of them. The year is what a biological age is worked out against — without it there is no number at all.',
  aboutTitle: 'A little about you.',
  conditionsLabel: 'ANYTHING YOU LIVE WITH',
  conditionsPlaceholder: 'In your own words. Kept exactly as you write it.',
  goalsHint: 'Pick as many as you like. Each one lands in the part of the app that covers it.',
  goalsTitle: 'What do you want to get out of this?',
  heightLabel: 'HEIGHT IN CM',
  heightWrong: 'Centimetres — somewhere between 50 and 250.',
  noAccount: 'No account, no sign-up. Nothing here is sent anywhere.',
  ready: 'Open OL1',
  recordsHint:
    'Anything you already have. Only the blood panel can be read today; the other two are noted so the app knows to ask later.',
  recordsTitle: 'What have you had done?',
  ringCentre: 'The middle is your Digital Twin — everything you feed the app, drawn as one figure.',
  ringHint: 'Tap any circle to open it. The + makes one of your own.',
  ringTitle: 'This is your ring.',
  sexLabel: 'THE FIGURE DRAWN',
  sexOnlyMale: 'Only the male figure is drawn so far. This is remembered and the drawing follows.',
  skip: 'Skip',
  storageNative: 'Everything you just gave stays in a file on this phone.',
  storageWeb:
    'This is the web preview, so what you just gave is kept in this browser and goes when its data is cleared. It is not durable storage for health data.',
  trainingHint:
    'Tapping one records it. Anything you type makes a new one, with its own coach, inside Exercise.',
  trainingTitle: 'What training do you actually do?',
  weightLabel: 'WEIGHT IN KG',
  weightNote: 'Filed as a weigh-in in Nutrition, with today on it, so it can go out of date honestly.',
  welcome: 'Welcome to One L1fe',
  writeFailed:
    'Something did not save. Open About you on the Digital Twin to check your year of birth.',
  yearLabel: 'YEAR OF BIRTH',
  yearWrong: 'That is not a year somebody was born in.',
} as const;

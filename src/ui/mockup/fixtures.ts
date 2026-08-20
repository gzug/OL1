/**
 * FIXTURES — invented for layout review. This repository is public.
 *
 * Fixtures may show SHAPE and CADENCE. Never VALUES or CAUSATION.
 * Banned: any unit (bpm, mmol, mg/dL, ms, kg, h, min), any percentage, any range, any diagnosis,
 * medication or lab value, any "X caused Y", any imperative advice.
 * Allowed: counts, dates, day-of-N progress, co-occurrence wording.
 *
 * Not derived from any person. Nothing here is a health statement.
 *
 * The prose is real length rather than placeholder, because the question these screens exist to
 * answer is whether the hierarchy holds — and that depends on whether a sentence wraps.
 */

/**
 * The hubs moved to `src/ui/hubs/catalog.ts` when they stopped being a fixed six and became data the
 * user can add to. Import them from there, not from here. Nothing about the ring order changed —
 * `orbitHubs()` returns the same six in the same sequence, which is what keeps
 * `tests/orbit-geometry.test.ts` meaningful across the move.
 */

/**
 * `driftNumber: '41.6'` and its caption used to live here and were rendered by both the Twin and
 * Home. They are gone: `src/ui/twin/BioAgeBlock.tsx` computes the real number from the panel you
 * added and the year you were born, and says plainly which input is missing when it cannot.
 *
 * Worth recording rather than quietly deleting — that fixture sat on the screen for weeks looking
 * exactly like a result, which is the most expensive kind of placeholder, because nobody reports it
 * as broken.
 */
export const centre = {
  focus: 'Today · the evening walk',
  insight: 'Your later nights landed on evening training days.',
} as const;

/**
 * What the twin is built out of, and how much of it is actually there.
 *
 * The owner asked that tapping the centre show "the pheno age or what data is included like
 * genomics, blood work, microbiome, wearable". Those four are listed — and separated by whether they
 * feed THE NUMBER or merely feed the twin, because they are not the same claim.
 *
 * PhenoAge is computed from a blood panel and an age. Today that is its only input, and a screen
 * that listed four sources under one number would imply the number gets richer as they connect. It
 * would not: connecting a wearable makes the twin know more, not the number more certain.
 *
 * `feedsNumber` is gone with the blood-work row it existed to separate — a discriminator every
 * remaining entry answers the same way is not separating anything.
 */
/**
 * **Blood work is no longer here.** It is the only source that feeds the number, so it comes from
 * the number's own state — `bloodWorkSource` in `src/ui/twin/BioAgeBlock.tsx`. A fixture saying
 * “9 of 9 markers” directly under a line saying no panel had been added is exactly the
 * contradiction that reaching the deployed preview made obvious.
 *
 * The wearable row now says what is true: nothing is connected. Health Connect is deferred until
 * the phone, so a green dot and “Nightly, from your watch” described a device that does not exist.
 */
export const twinSources = [
  {
    detail: 'Not connected yet',
    label: 'Wearable',
    state: 'missing',
  },
  {
    detail: 'Not connected yet',
    label: 'Genomics',
    state: 'missing',
  },
  {
    detail: 'Not connected yet',
    label: 'Microbiome',
    state: 'missing',
  },
] as const;

export const twin = {
  completedTests: [
    { outcome: 'No clear difference', title: 'Morning light · finished 12 Mar' },
    { outcome: 'Kept it, felt easier', title: 'Earlier dinner · finished 2 Feb' },
  ],
  insights: [
    'Your quietest weeks are the ones with two rest days, not three.',
    'Later dinners tend to land on days with an evening session.',
  ],
  /**
   * `ledger` and `ledgerFooter` were four invented rows and the total "148". They are gone —
   * `src/ui/twin/Ledger.tsx` lists what has actually been recorded, across every hub, and shows no
   * footer at all when nothing is being hidden. A footer naming a total has to stand behind it.
   */
  person: {
    facts: ['12 lab reports', 'connected since Jan', '3 tests done'],
    name: 'Sample person — invented for layout review',
  },
  runningTest: {
    /** A shape, not a value: six of fourteen cells filled. */
    daysDone: 6,
    daysTotal: 14,
    label: 'Day 6 of 14',
    title: 'Evening light',
  },
} as const;

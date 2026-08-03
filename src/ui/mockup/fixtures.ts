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

export const centre = {
  /** Years with a decimal, not an index out of 100. A measurement, not a grade. */
  driftNumber: '41.6',
  /** The strongest device on the screen: a number carrying a weeks-old date is not today's result. */
  driftCaption: 'Biological age · bloodwork 12 Mar',
  focus: 'Today · the evening walk',
  insight: 'Your later nights landed on evening training days.',
} as const;

export const twin = {
  completedTests: [
    { outcome: 'No clear difference', title: 'Morning light · finished 12 Mar' },
    { outcome: 'Kept it, felt easier', title: 'Earlier dinner · finished 2 Feb' },
  ],
  insights: [
    'Your quietest weeks are the ones with two rest days, not three.',
    'Later dinners tend to land on days with an evening session.',
  ],
  ledger: [
    { date: '12 Mar', entry: 'Lab report added' },
    { date: '11 Mar', entry: 'Note added' },
    { date: '10 Mar', entry: 'Test started — Evening light' },
    { date: '2 Feb', entry: 'Test closed — Earlier dinner' },
  ],
  ledgerFooter: 'Showing 4 of 148',
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

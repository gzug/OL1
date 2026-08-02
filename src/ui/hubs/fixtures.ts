/**
 * FIXTURES — invented for layout review. This repository is public.
 *
 * Same law as `src/ui/mockup/fixtures.ts`, restated because this file will be read on its own:
 * fixtures may show SHAPE and CADENCE, never VALUES or CAUSATION. No unit, no percentage, no range,
 * no diagnosis, no medication, no lab value, no "X caused Y", no imperative advice. Counts, dates,
 * day-of-N progress and co-occurrence wording are what is left, and they are enough.
 *
 * That law is also why this hub cannot show a score, and `docs/decisions/0004-nutrition-hub.md`
 * argues it should not want to: coverage says how much the domain knows, which stays true when the
 * data is thin. Legacy needed `MIN_DAYS_FOR_A_WEEKLY_CLAIM` to stop a score claiming a week off one
 * lunch. Nothing here has that failure available to it.
 *
 * Not derived from any person. Nothing here is a health statement.
 */

import type { HubId } from '@/ui/mockup/fixtures';

/**
 * Whether the hub is reading this facet itself, reading it through another hub, or not reading it
 * at all. `missing` is a first-class state and renders as plainly as the other two — an absence the
 * user can act on is the most useful row on the screen, not an error to hide.
 */
export type FacetState = 'elsewhere' | 'missing' | 'reading';

export type HubFacet = {
  /** What is actually there. Counts and dates only. */
  readonly detail: string;
  readonly label: string;
  readonly state: FacetState;
};

/** A question that opens chat already pointed at something. Never an empty box. */
export type HubThread = {
  readonly id: string;
  readonly label: string;
};

export type HubState = {
  /** What the observation rests on. It is the sentence that keeps the one above it honest. */
  readonly basis: string;
  readonly contribute: {
    readonly note: string;
    readonly primary: string;
    readonly secondary: string;
  };
  readonly facets: readonly HubFacet[];
  /** Co-occurrence, never cause. The grammar is Home's weekly insight, kept deliberately. */
  readonly observation: string;
  readonly threads: readonly HubThread[];
};

/**
 * The four facets are Legacy's own nutrition domain set — `nutrition`, `biomarkers`,
 * `micronutrients`, `hydration` from `apps/mobile/src/data/coach/coachDomains.ts`. Reused rather
 * than re-invented: that list is what the coach side already reasons about, and a hub that groups
 * the domain differently from the assistant would be two products.
 *
 * Biomarkers reads `elsewhere` on purpose. It is genuinely shared with Labs, and a hub that quietly
 * restated another hub's data would make the orbit six copies of one screen.
 */
export const nutritionHub: HubState = {
  basis: 'From 9 meals logged across 4 of the last 7 days.',
  contribute: {
    note: 'Neither way in is built yet.',
    primary: 'Log a meal with a photo',
    secondary: 'Enter it by hand',
  },
  facets: [
    { detail: '9 logged across 4 of the last 7 days', label: 'Meals', state: 'reading' },
    { detail: 'Last lab report, 12 Mar', label: 'Micronutrients', state: 'reading' },
    { detail: 'Shared with Labs', label: 'Biomarkers', state: 'elsewhere' },
    { detail: 'Not connected yet', label: 'Hydration', state: 'missing' },
  ],
  observation: 'Your later meals land on the days you train in the evening.',
  threads: [
    { id: 'evening', label: 'Evening meals and evening training' },
    { id: 'labs', label: 'What changed since the last lab report' },
    { id: 'hydration', label: 'What hydration would add here' },
  ],
};

/**
 * Only Nutrition is designed. The other five keep the stub rather than getting a thin copy of this
 * one — a hub filled in to look finished is the harder thing to correct later.
 */
export const HUB_STATES: Partial<Record<HubId, HubState>> = {
  nutrition: nutritionHub,
};

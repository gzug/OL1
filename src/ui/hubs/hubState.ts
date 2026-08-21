/**
 * What a hub holds.
 *
 * A hub opens two doors — its coach, and its cockpit — and this type is the cockpit's side of that.
 * `docs/decisions/0005-the-hub-model.md` argues the shape; the short version is that a cockpit shows
 * the domain's data across yesterday, the week and further back, and never grades it. Showing the
 * numbers was always allowed. Grading them is what the spec rejects.
 *
 * Every band is optional except coverage. A hub renders only what it has: Mind has no way to
 * contribute and no connected source, and the honest screen for that is a short one.
 *
 * FIXTURES — every value under `states/` is invented for layout review, in a public repository.
 * Legacy's own demo activity set was deliberately NOT copied: its file is named `strava_export`,
 * carries 258 rows with real-looking Strava ids, German auto-generated titles and heart rates, and
 * whether or not it is synthetic as its header claims, it is not ours to republish. Nothing here is
 * derived from any person and nothing here is a health statement.
 */

/** Whether the hub reads this facet itself, reads it through another hub, or not at all. */
/**
 * The line dividing a hub screen's real content from its fixtures.
 *
 * Lives here rather than in `HubScreen.tsx` so a bare-Node test can reach it — the whole file it
 * sits in is the vocabulary of what a fixture IS, which makes this the sentence's natural home.
 *
 * It used to be the last line of `StoredEntries` and read "everything below this is sample data".
 * That was true when the only real block on a hub screen was the stored-entry list. It stopped
 * being true as the logged week, the panel's age, kidney function and the marker list arrived
 * beneath it — at which point it was labelling a person's own results as invented.
 *
 * **A boundary marker that is not at the boundary is worse than none**, because it teaches people
 * to distrust the true half.
 */
export const SAMPLE_DATA_LINE = 'Everything below this line is sample data, invented for layout.';

export type FacetState = 'elsewhere' | 'missing' | 'reading';

export type HubFacet = {
  /** What is actually there. Counts, dates, and the plainest possible phrasing. */
  readonly detail: string;
  readonly label: string;
  readonly state: FacetState;
};

/** One measured thing, and when it was measured. The date is half the row, not a footnote. */
export type CockpitRow = {
  readonly label: string;
  readonly value: string;
  readonly when: string;
};

/** A stretch of time the cockpit reports on: last night, this week, since the last panel. */
export type CockpitPeriod = {
  readonly label: string;
  readonly rows: readonly CockpitRow[];
};

/**
 * One day in the seven-day strip. `fill` is 0 to 1 and carries no unit on purpose — the strip is
 * there to show rhythm and gaps, and a bar that invites reading an exact value off it would be
 * making a claim the caption underneath already makes better.
 */
export type DayBar = {
  readonly fill: number;
  readonly label: string;
};

export type HubCockpit = {
  /** Shown instead of the periods when the hub reads nothing. An empty hub is a short screen. */
  readonly empty?: string;
  readonly periods: readonly CockpitPeriod[];
  readonly week?: {
    readonly caption: string;
    readonly days: readonly DayBar[];
  };
};

export type HubState = {
  /** What the observation rests on. The sentence that keeps the one above it honest. */
  readonly basis?: string;
  readonly cockpit: HubCockpit;
  readonly contribute?: {
    /**
     * Where the primary way in leads, when it leads anywhere yet. Absent means the button is still
     * a placeholder and says so on press — which is most of them, and saying so beats a dead tap.
     */
    readonly href?: '/add-panel' | '/log-meal' | '/log-session';
    readonly note: string;
    readonly primary: string;
    readonly secondary?: string;
  };
  readonly facets: readonly HubFacet[];
  /** Co-occurrence, never cause. Same grammar as Home's weekly insight, kept deliberately. */
  readonly observation?: string;
};

/**
 * A hub with nothing invented in it.
 *
 * Every hub the app ships has a `HubState` under `states/` full of sample periods and coverage
 * facets. A hub somebody made has none, and the screen used to answer that with a stub reading
 * "Nothing has been recorded in this hub yet" — printed without reading the store, while the
 * first-run flow was filing goals into those very hubs.
 *
 * This is the honest shape instead: no observation, no basis, no cockpit, no facets. `HubScreen`
 * renders what is really in the store above it and nothing below, and its sample-data marker
 * correctly does not appear, because there is no sample data.
 */
export function emptyHubState(): HubState {
  return { cockpit: { periods: [] }, facets: [] };
}

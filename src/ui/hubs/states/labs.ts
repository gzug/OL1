import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * Labs has no week strip and no daily period, and that is the point rather than an omission: a
 * panel arrives every few months, so a seven-day rhythm would be seven empty days. The cockpit
 * reports what a slow domain actually has — the last panel, and the distance to it.
 *
 * No marker is named and no value is given. Naming one would put a lab result on a public preview
 * and invite it to be read as a finding, which is the one thing the fixtures rule is firmest about.
 *
 * **A count is still a claim.** This said `34 markers` while the panel screen has never accepted
 * more than seventeen — nine the age calculation reads and eight it records — so the sample cockpit
 * described an app that cannot exist. Being labelled sample data does not license a number the
 * product can never produce: it sets an expectation, and the real cockpit that replaces this one
 * would read as a regression against it.
 */
export const labs: HubState = {
  basis: 'From 1 panel, uploaded 12 Mar.',
  /**
   * **The sample cockpit is gone, because a real one exists.**
   *
   * `src/ui/labs/PanelCockpit.tsx` reads the panels on file. Its rows are the date, how many
   * markers the panel carried, and whether it carries the nine the age calculation needs — the
   * last of which was the reason to build it: a panel that cannot produce a biological age said so
   * nowhere a person would look while holding their report.
   *
   * The invented rows had claimed `34 markers read` and `34 of 34 verified` on a screen that has
   * never accepted more than seventeen. `hub-states.test.ts` guards the ceiling on what is left.
   */
  cockpit: {
    empty: 'Your own panels fill the cockpit above this line. There is no invented one left here.',
    periods: [],
  },
  contribute: {
    href: '/add-panel',
    note: 'Reading a report is not built yet — the review gate behind this is.',
    primary: 'Add a panel',
    secondary: 'Photo, file, or by hand',
  },
  facets: [
    { detail: '12 markers from the 12 Mar panel', label: 'Blood panel', state: 'reading' },
    { detail: 'One panel — no trend yet', label: 'Trends', state: 'missing' },
    { detail: 'Not connected yet', label: 'Genomics', state: 'missing' },
    { detail: 'Not connected yet', label: 'Microbiome', state: 'missing' },
  ],
  observation: 'One panel is a starting point, not a trend. A second one is what makes it a line.',
};

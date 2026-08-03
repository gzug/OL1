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
 */
export const labs: HubState = {
  basis: 'From 1 panel, uploaded 12 Mar.',
  cockpit: {
    periods: [
      {
        label: 'Last panel',
        rows: [
          { label: 'Uploaded', value: '12 Mar', when: 'about five months ago' },
          { label: 'Markers read', value: '34', when: 'from that panel' },
          { label: 'Verified by you', value: '34 of 34', when: 'at upload' },
        ],
      },
      {
        label: 'Since then',
        rows: [
          { label: 'New panels', value: 'None', when: 'nothing since 12 Mar' },
          { label: 'Feeds the drift number', value: 'Yes', when: 'it is the only source' },
        ],
      },
    ],
  },
  contribute: {
    href: '/add-panel',
    note: 'Reading a report is not built yet — the review gate behind this is.',
    primary: 'Add a panel',
    secondary: 'Photo, file, or by hand',
  },
  facets: [
    { detail: '34 markers from the 12 Mar panel', label: 'Blood panel', state: 'reading' },
    { detail: 'One panel — no trend yet', label: 'Trends', state: 'missing' },
    { detail: 'Not connected yet', label: 'Genomics', state: 'missing' },
    { detail: 'Not connected yet', label: 'Microbiome', state: 'missing' },
  ],
  observation: 'One panel is a starting point, not a trend. A second one is what makes it a line.',
};

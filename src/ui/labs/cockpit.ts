import type { HubEntry } from '@/core/hubs';
import { day } from '@/ui/hubs/entryWords';
import type { CockpitPeriod } from '@/ui/hubs/hubState';
import { LEVINE_MARKERS } from '@/ui/labs/levine';
import { EXTRA_MARKERS } from '@/ui/labs/lipids';

/**
 * A cockpit made of your own panels.
 *
 * The second one filled from real entries, after Exercise. It sits above the sample line and the
 * invented rows it replaces are gone — those claimed `34 markers read` on a screen that has never
 * accepted more than seventeen.
 *
 * **It does not repeat `PanelAge` above it.** That block says how old the last panel is in words
 * and how many panels there are; what it cannot say is the DATE, how much was on the panel, or the
 * one thing a person cannot work out for themselves:
 *
 * **whether the panel carries the nine the age calculation needs.** `YourMarkers` lists what is
 * absent, and `BioAgeBlock` lives on another screen entirely, so a panel that cannot produce a
 * biological age said so nowhere a person would look while holding their report. That row is the
 * reason this file exists rather than being three lines in `PanelAge`.
 */

const PANEL_CEILING = LEVINE_MARKERS.length + EXTRA_MARKERS.length;

/** Only the keys this app records. A report line it cannot read is not a marker it holds. */
function markersOn(entry: HubEntry): readonly string[] {
  const markers = entry.payload.markers;
  if (typeof markers !== 'object' || markers === null) return [];

  const held = markers as Readonly<Record<string, unknown>>;
  return [...LEVINE_MARKERS, ...EXTRA_MARKERS]
    .map((marker) => marker.key)
    .filter((key) => {
      const value = held[key];
      return typeof value === 'number' && Number.isFinite(value);
    });
}

/** How many of the nine the formula reads are on a panel. Nine is the only number that computes. */
export function levineCount(entry: HubEntry): number {
  const on = new Set(markersOn(entry));
  return LEVINE_MARKERS.filter((marker) => on.has(marker.key)).length;
}

export function labsPeriods(entries: readonly HubEntry[], now: string): readonly CockpitPeriod[] {
  const panels = entries
    .filter((entry) => entry.kind === 'panel')
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  const last = panels[0];
  if (last === undefined) return [];

  const held = markersOn(last).length;
  const nine = levineCount(last);
  const short = LEVINE_MARKERS.length - nine;

  return [
    {
      label: 'Last panel',
      rows: [
        {
          label: 'Drawn',
          value: day(last.recordedAt),
          /* NOT how long ago. `PanelAge` sits directly above this and its whole first line is
             "Drawn this month." — printing it again a finger's width lower said one thing twice
             under two headings that also said the same thing.
             What this row can add instead is WHICH date it is. `recordedAt` is when the blood was
             drawn, never when the panel was typed, and the fixture that used to sit here said
             "Uploaded" — which is a different day and the wrong mental model to teach. */
          when: 'the date on your report, not the day you typed it',
        },
        {
          label: 'Markers on it',
          value: String(held),
          when: `of ${PANEL_CEILING} this app records`,
        },
        {
          label: 'The age calculation reads',
          value: `${nine} of ${LEVINE_MARKERS.length}`,
          when:
            short === 0
              ? 'all nine are here, so a biological age can be worked out'
              : `${short} missing, so no biological age is worked out`,
        },
      ],
    },
  ];
}

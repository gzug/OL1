import { Fragment } from 'react';

import { HubBrief } from '@/ui/hubs/HubBrief';
import { coachForHub } from '@/ui/hubs/catalog';
import { coachFor } from '@/ui/hubs/mergeHubs';

import { Rule, Section } from './parts';
import { COPY } from './settings';
import type { SettingsData } from './useSettings';

/**
 * How each coach works, in your own words.
 *
 * **This renders `HubBrief` itself, once per coach — it does not summarise one.** The obvious
 * version of this section was a row per hub showing the first line of its brief, which tapped open
 * an editor. That is two copies of the same sentence: the row would go stale the moment the box
 * beside it was edited, and a screen showing a person yesterday's words under a heading saying how
 * their coach works is `docs/decisions/0013` with extra steps.
 *
 * Rendering the real component instead means one reader, one writer, and nothing to keep in sync.
 * `HubBrief` already collapses to a single line when a brief is set and to an invitation naming the
 * coach when it is not, so each block labels itself and this file adds no vocabulary of its own.
 *
 * **Hidden hubs are left out.** Their coaches are not reachable from the ring, and a brief for one
 * would be a setting for something a person has put away.
 */
export function CoachBriefsSection({ data }: { data: SettingsData }) {
  const away = new Set(data.hidden);

  /**
   * A hub that has a coach: the seeded ones from the catalog, and a hub somebody made, whose coach
   * `coachFor` builds from the hub itself rather than storing a second copy beside it. The Open
   * Table has neither and drops out here — it is the way to reach every coach, not one of them.
   */
  const coached = data.hubs
    .filter((hub) => !away.has(hub.id))
    .map((hub) => ({ coach: coachForHub(hub.id, data.hubs) ?? coachFor(hub), hub }))
    .filter((entry) => entry.coach !== undefined);

  if (coached.length === 0) return null;

  return (
    <Section hint={COPY.briefsHint} title={COPY.briefsTitle}>
      {coached.map((entry, index) => (
        <Fragment key={entry.hub.id}>
          {index > 0 && <Rule />}
          <HubBrief coach={entry.coach} hubId={entry.hub.id} />
        </Fragment>
      ))}
    </Section>
  );
}

import { Fragment, useState } from 'react';

import { HubBrief } from '@/ui/hubs/HubBrief';
import { coachForHub } from '@/ui/hubs/catalog';
import { coachFor } from '@/ui/hubs/mergeHubs';

import { Row, Rule, Section } from './parts';
import { COPY } from './settings';
import type { SettingsData } from './useSettings';

/**
 * How each coach works, in your own words.
 *
 * **This opens `HubBrief` itself — it does not summarise one.** The obvious version was a row per
 * coach showing the first line of its brief; that is two copies of the same sentence, and the row
 * goes stale the moment the box beside it is edited. A screen showing yesterday's words under a
 * heading saying how a coach works is `docs/decisions/0013` with extra steps. So the row carries
 * the coach's name and nothing about the person, and the real component underneath carries the
 * truth. Nothing here can be out of date, because nothing here is a claim.
 *
 * **The rows exist because rendering all six briefs at once was unreadable.** Walked on the deployed
 * screen, `HOW EACH COACH WORKS` was six near-identical accent-green sentences — *Tell Exercise
 * Coach how to work with you*, six times — with the only word that differed buried in the middle of
 * each. Invisible to every check in this repository, and obvious in one look at the screen. One
 * name per row puts the difference at the start of the line, where it can be scanned.
 *
 * **Hidden hubs are left out.** Their coaches are not reachable from the ring, and a brief for one
 * would be a setting for something a person has put away.
 */
export function CoachBriefsSection({ data }: { data: SettingsData }) {
  const [open, setOpen] = useState<string | null>(null);
  const away = new Set(data.hidden);

  /**
   * A hub that has a coach: the seeded ones from the catalog, and a hub somebody made, whose coach
   * `coachFor` builds from the hub itself rather than storing a second copy beside it. The Open
   * Table has neither and drops out here — it is the way to reach every coach, not one of them.
   */
  const coached = data.hubs
    .filter((hub) => !away.has(hub.id))
    .flatMap((hub) => {
      const coach = coachForHub(hub.id, data.hubs) ?? coachFor(hub);
      return coach === undefined ? [] : [{ coach, hub }];
    });

  if (coached.length === 0) return null;

  return (
    <Section hint={COPY.briefsHint} title={COPY.briefsTitle}>
      {coached.map((entry, index) => (
        <Fragment key={entry.hub.id}>
          {index > 0 && <Rule />}
          <Row
            action={open === entry.hub.id ? '⌃' : '›'}
            label={entry.coach.name}
            onPress={() => setOpen((current) => (current === entry.hub.id ? null : entry.hub.id))}
          />
          {open === entry.hub.id && <HubBrief coach={entry.coach} hubId={entry.hub.id} />}
        </Fragment>
      ))}
    </Section>
  );
}

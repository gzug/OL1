import { Fragment, useState } from 'react';

import { HubBrief } from '@/ui/hubs/HubBrief';
import { coachForHub } from '@/ui/hubs/catalog';
import { coachFor } from '@/ui/hubs/mergeHubs';

import { Line, Note, Screen } from './chrome';
import { COPY } from './rows';
import { useSettings } from './useSettings';

/**
 * Coaches — what each one has been told about how to work with you.
 *
 * **This is where Memory went.** The owner had a Memory row in his first list and then removed it,
 * for the right reason: people relate to the thing they can point at, and Memory was the
 * abstraction over Profile, Goals, Hubs and the coaches. So there is no Memory screen; there is a
 * list of coaches, each showing what it knows, in the person's own words.
 *
 * **It opens `HubBrief` itself rather than summarising one.** The obvious build was a row per coach
 * showing the first line of its brief, with an editor behind it — two copies of the same sentence,
 * where the row goes stale the moment the box beside it is edited. A screen showing yesterday's
 * words under a heading saying how a coach works is `docs/decisions/0013` with extra steps.
 *
 * So the row carries the coach's name and nothing about the person, and the real component
 * underneath carries the truth. Nothing here can be out of date, because nothing here is a claim.
 *
 * **Hidden hubs are left out.** Their coaches are not reachable from the ring, and a brief for one
 * would be a setting for something a person has put away.
 */
export function CoachesScreen() {
  const [open, setOpen] = useState<string | null>(null);
  const { data } = useSettings();

  if (data.status === 'unknown') return <Screen title={COPY.coachesTitle}>{null}</Screen>;
  if (data.status === 'failed') {
    return (
      <Screen title={COPY.coachesTitle}>
        <Note text={COPY.unread} />
      </Screen>
    );
  }

  const away = new Set(data.value.hidden);

  /**
   * A hub that has a coach: the seeded ones from the catalog, and a hub somebody made, whose coach
   * `coachFor` builds from the hub itself rather than storing a second copy beside it. The Open
   * Table has neither and drops out here — it is the way to reach every coach, not one of them.
   */
  const coached = data.value.hubs
    .filter((hub) => !away.has(hub.id))
    .flatMap((hub) => {
      const coach = coachForHub(hub.id, data.value.hubs) ?? coachFor(hub);
      return coach === undefined ? [] : [{ coach, hub }];
    });

  return (
    <Screen title={COPY.coachesTitle}>
      <Note text={COPY.coachesHint} />

      {coached.map((entry) => (
        <Fragment key={entry.hub.id}>
          <Line
            action={open === entry.hub.id ? '⌃' : '›'}
            label={entry.coach.name}
            onPress={() => setOpen((current) => (current === entry.hub.id ? null : entry.hub.id))}
            value={entry.hub.label}
          />
          {open === entry.hub.id && <HubBrief coach={entry.coach} hubId={entry.hub.id} />}
        </Fragment>
      ))}
    </Screen>
  );
}

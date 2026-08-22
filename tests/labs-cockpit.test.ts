import assert from 'node:assert/strict';
import test from 'node:test';

import type { HubEntry } from '../src/core/hubs';
import { labsPeriods, levineCount } from '../src/ui/labs/cockpit';
import { LEVINE_MARKERS } from '../src/ui/labs/levine';
import { EXTRA_MARKERS } from '../src/ui/labs/lipids';

/**
 * The Labs cockpit, from real panels. **Every value here is invented.**
 *
 * The row worth having is the last one: whether the panel carries the nine the age calculation
 * reads. `YourMarkers` lists what is absent and `BioAgeBlock` lives on another screen, so a panel
 * that cannot produce a biological age said so nowhere a person would look while holding a report.
 */

const NOW = '2026-08-22T09:00:00.000Z';

const NINE = Object.fromEntries(LEVINE_MARKERS.map((marker) => [marker.key, marker.sane.min + 1]));

const panel = (recordedAt: string, markers: Record<string, number>): HubEntry => ({
  hubId: 'labs',
  id: `panel-${recordedAt}`,
  kind: 'panel',
  payload: { markers },
  recordedAt,
  source: 'manual',
});

test('no panel draws nothing at all', () => {
  assert.deepEqual(labsPeriods([], NOW), []);
  assert.deepEqual(
    labsPeriods([{ ...panel('2026-08-01T00:00:00.000Z', NINE), kind: 'note' }], NOW),
    [],
    'a note in the Labs hub is not a panel',
  );
});

test('the newest panel is the one reported, whatever order they arrive in', () => {
  const [block] = labsPeriods(
    [
      panel('2026-02-01T00:00:00.000Z', NINE),
      panel('2026-08-01T00:00:00.000Z', NINE),
      panel('2026-05-01T00:00:00.000Z', NINE),
    ],
    NOW,
  );

  assert.equal(block?.label, 'Last panel');
  assert.deepEqual(block?.rows[0], {
    label: 'Drawn',
    value: '1 Aug',
    /* Which date it is, not how long ago — `PanelAge` sits directly above and already says that,
       and the fixture this replaced called it "Uploaded", which is a different day. */
    when: 'the date on your report, not the day you typed it',
  });
});

/**
 * **The row this file exists for.**
 *
 * Nine of nine and an age can be worked out. Eight of nine and it cannot — `computePhenoAgeRange`
 * reads exactly nine keys — and nothing else on this screen said so.
 */
test('a panel says whether it carries the nine the calculation reads', () => {
  const whole = labsPeriods([panel('2026-08-01T00:00:00.000Z', NINE)], NOW)[0];
  assert.deepEqual(whole?.rows[2], {
    label: 'The age calculation reads',
    value: '9 of 9',
    when: 'all nine are here, so a biological age can be worked out',
  });

  /* One marker short — which one does not matter, the calculation needs all nine. */
  const eight = Object.fromEntries(
    LEVINE_MARKERS.slice(1).map((marker) => [marker.key, marker.sane.min + 1]),
  );
  const partial = labsPeriods([panel('2026-08-01T00:00:00.000Z', eight)], NOW)[0];
  assert.deepEqual(partial?.rows[2], {
    label: 'The age calculation reads',
    value: '8 of 9',
    when: '1 missing, so no biological age is worked out',
  });
});

/**
 * **A count that is read cannot overclaim.** The fixture this replaced said `34 markers read` on a
 * screen that has never accepted more than seventeen; the ceiling here is the two marker lists.
 */
test('the count is what is on the panel, and never more than can be', () => {
  const ceiling = LEVINE_MARKERS.length + EXTRA_MARKERS.length;
  const everything = {
    ...NINE,
    ...Object.fromEntries(EXTRA_MARKERS.map((marker) => [marker.key, marker.sane.min + 1])),
  };

  const full = labsPeriods([panel('2026-08-01T00:00:00.000Z', everything)], NOW)[0];
  assert.deepEqual(full?.rows[1], {
    label: 'Markers on it',
    value: String(ceiling),
    when: `of ${ceiling} this app records`,
  });

  /* A report line this app does not record is not a marker it holds, however numeric it looks. */
  const stranger = labsPeriods(
    [panel('2026-08-01T00:00:00.000Z', { ...NINE, ferritin: 88, tsh: 1.4 })],
    NOW,
  )[0];
  assert.equal(stranger?.rows[1]?.value, String(LEVINE_MARKERS.length));
});

test('a marker that is not a usable number is not counted', () => {
  const entry = panel('2026-08-01T00:00:00.000Z', NINE);
  const broken: HubEntry = {
    ...entry,
    payload: { markers: { ...NINE, albumin: Number.NaN, crp: '2.1' } },
  };

  assert.equal(levineCount(broken), LEVINE_MARKERS.length - 2);
});

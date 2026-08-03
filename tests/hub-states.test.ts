import assert from 'node:assert/strict';
import test from 'node:test';

import { orbitHubs } from '../src/ui/hubs/catalog';
import { HUB_STATES, hubStateFor } from '../src/ui/hubs/states';

/**
 * A hub's cockpit is hand-written per hub, so nothing here can be checked by the type system beyond
 * its shape. These assertions are about the claims the screen makes: that a strip is really a week,
 * that a hub with nothing says so instead of rendering blank, and that no fixture wanders into
 * naming a lab marker on a public preview.
 */

test('every hub in the orbit has a cockpit written for it', () => {
  for (const hub of orbitHubs()) {
    assert.ok(hubStateFor(hub.id) !== undefined, `hub "${hub.id}" is on the ring with no state`);
  }
});

test('a cockpit either reports periods or says why it is empty, never neither', () => {
  for (const [id, state] of Object.entries(HUB_STATES)) {
    const hasPeriods = state.cockpit.periods.length > 0;
    const explains = state.cockpit.empty !== undefined;
    assert.ok(
      hasPeriods || explains,
      `"${id}" has no cockpit periods and no sentence explaining the absence — it renders blank`,
    );
  }
});

test('a week strip is seven days, and every bar is a fraction', () => {
  for (const [id, state] of Object.entries(HUB_STATES)) {
    const week = state.cockpit.week;
    if (week === undefined) continue;

    assert.equal(week.days.length, 7, `"${id}" calls it a week and shows ${week.days.length} days`);
    assert.ok(week.caption.length > 0, `"${id}" has a strip with no caption to disambiguate a gap`);
    for (const day of week.days) {
      assert.ok(day.fill >= 0 && day.fill <= 1, `"${id}" has a bar at ${day.fill}, outside 0 to 1`);
    }
  }
});

test('every hub states its coverage, including the hubs that read nothing', () => {
  for (const [id, state] of Object.entries(HUB_STATES)) {
    assert.ok(state.facets.length > 0, `"${id}" claims no coverage at all`);
    for (const facet of state.facets) {
      assert.ok(facet.detail.length > 0, `"${id}" has a facet "${facet.label}" with no detail`);
    }
  }
});

/**
 * An observation is an interpretation, and it is only allowed to stand on a stated basis. Mind has
 * neither, deliberately: nothing is connected, so there is nothing to observe. What must never
 * happen is one without the other.
 */
test('an observation never appears without the basis it rests on', () => {
  for (const [id, state] of Object.entries(HUB_STATES)) {
    if (state.observation === undefined) continue;
    assert.ok(state.basis !== undefined, `"${id}" makes an observation with no stated basis`);
  }
});

/**
 * The repository is public and these are invented fixtures. Counts, dates and durations are fine;
 * a named marker with a value would read as somebody's result. This is a blunt check on the words
 * most likely to slip in, not a claim to catch everything.
 */
test('no fixture names a clinical marker or a diagnosis', () => {
  const banned = /\b(mmol|mg\/dL|ng\/mL|hba1c|ldl|hdl|cholesterol|glucose|crp|tsh|diagnos)/i;

  for (const [id, state] of Object.entries(HUB_STATES)) {
    const text = [
      state.observation ?? '',
      state.basis ?? '',
      state.cockpit.empty ?? '',
      ...state.cockpit.periods.flatMap((p) => p.rows.flatMap((r) => [r.label, r.value, r.when])),
      ...state.facets.flatMap((f) => [f.label, f.detail]),
    ].join(' ');

    const hit = banned.exec(text);
    assert.equal(hit, null, `"${id}" fixture contains "${hit?.[0]}", which reads as a lab result`);
  }
});

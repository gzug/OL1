/**
 * One file per hub, assembled here.
 *
 * Split deliberately rather than kept in one map: several sessions design hubs in parallel, and a
 * shared file is the one thing guaranteed to make two pull requests touch the same lines. A hub is
 * one new file plus one line here.
 *
 * A hub with no entry is not an error. Hubs are data the user can add to, so most hubs will never
 * have a hand-written state — `hubStateFor` returns undefined and the screen says so.
 */

import type { HubId } from '../catalog';
import type { HubState } from '../hubState';

import { exercise } from './exercise';
import { labs } from './labs';
import { medical } from './medical';
import { nutrition } from './nutrition';
import { resilience } from './resilience';
import { sleep } from './sleep';

export const HUB_STATES: Readonly<Record<HubId, HubState>> = {
  exercise,
  labs,
  medical,
  nutrition,
  resilience,
  sleep,
};

export function hubStateFor(id: HubId): HubState | undefined {
  return Object.prototype.hasOwnProperty.call(HUB_STATES, id) ? HUB_STATES[id] : undefined;
}

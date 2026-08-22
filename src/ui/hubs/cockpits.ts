/**
 * Which hubs build their cockpit from stored entries.
 *
 * **One record of it, and the render map is typed against this list**, so a hub cannot be on one
 * and missing from the other. Until now the only record was six JSX conditions inside `HubScreen`,
 * which nothing else could read — and three things needed to know: what to render, whether the
 * fixture still owes a cockpit, and whether the sample-data marker has anything left to mark.
 *
 * The symptom was small and exact. Every fixture whose cockpit had been replaced carried a sentence
 * saying so — "Your own meals fill the cockpit above this line" — a note about a fixture, rendered
 * to a person, whose only real job was to stop a test failing. It also kept the sample marker up
 * over four screens with nothing invented left on them.
 *
 * A hub in this list may still carry an invented cockpit as well: Resilience does, because
 * heart-rate variability and resting heart rate cannot be filled until there is a watch, and a
 * block showing only the words would imply the rest had been dropped.
 */
export const REAL_COCKPIT_HUBS = [
  'exercise',
  'labs',
  'medical',
  'nutrition',
  'resilience',
  'sleep',
] as const;

export type RealCockpitHub = (typeof REAL_COCKPIT_HUBS)[number];

export function hasRealCockpit(hubId: string): hubId is RealCockpitHub {
  return (REAL_COCKPIT_HUBS as readonly string[]).includes(hubId);
}

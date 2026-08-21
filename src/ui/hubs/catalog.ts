/**
 * The hub and coach catalog.
 *
 * Hubs used to be a fixed union of six ids. They are data now, because the owner asked for hubs the
 * user can create — from the `+` on the ring, and from inside a hub. A hub that only exists
 * once someone taps "new" cannot have a screen written for it in advance, so nothing here may be
 * keyed on a literal hub id ever again.
 *
 * What that costs: the compiler no longer catches a typo'd hub id, and `HUBS.find(...)` can return
 * undefined where it previously could not. Both are handled at the one place it matters, the hub
 * route, which already had to answer for an unknown `[id]` segment. What it buys is the only thing
 * that makes user-created hubs possible at all.
 *
 * FIXTURES — the seed data below is invented for layout review. This repository is public. Same law
 * as `src/ui/mockup/fixtures.ts`: shape and cadence, never values or causation. Not derived from
 * any person. Nothing here is a health statement.
 */

export type CoachId = string;
export type HubId = string;

/**
 * One coach per hub. The user picks coaches, never models — model routing stays automatic and
 * invisible, so nothing on a coach names a provider or a model.
 */
export type Coach = {
  /** One line, present tense, what this coach is responsible for. Shown in the selector. */
  readonly focus: string;
  readonly id: CoachId;
  readonly name: string;
};

export type HubOrigin = 'builtIn' | 'user';

/**
 * What a place on the ring is for.
 *
 * `domain` is every hub in the ordinary sense: it has a coach, a cockpit, and data of its own.
 * `table` is the Open Table, which the owner asked to sit on the ring "as one of the hubs" rather
 * than as a button at the bottom. It has no coach of its own because it is the one that reaches
 * every coach, and no cockpit because it holds no data — so it is a place on the ring and not a
 * hub, and the type says which.
 */
export type HubRole = 'domain' | 'table';

export type HubDefinition = {
  /** Absent only for the Open Table, which reaches every coach rather than having one. */
  readonly coachId?: CoachId;
  readonly id: HubId;
  readonly label: string;
  /**
   * What the circle on the ring says, when the full label does not fit inside one.
   *
   * A hub circle is 64 pixels across and its label is one line, so about ten characters is the
   * whole budget — "Medical condition" truncates to "Medical con…", which reads as a bug. The hub
   * keeps its real name everywhere it has room: the screen, the coach selector, the history list.
   * Absent for every hub whose name already fits, which is all of the others.
   */
  readonly ringLabel?: string;
  /**
   * Set when this hub lives inside another. Two seeded parents: Exercise holds the five exercise
   * types, and Health record holds Labs. The relation is deliberately flat rather than a nested
   * tree — a user adding a hub writes one row, and a flat list is what a store can hold without a
   * migration when nesting goes deeper.
   */
  readonly parentId?: HubId;
  readonly origin: HubOrigin;
  /** Defaults to `domain`. Only the Open Table is anything else. */
  readonly role?: HubRole;
};

/**
 * Coaches.
 *
 * PORTED from Legacy `data/demo/demoPreviewFixtures.ts`, which already carried exactly the shape the
 * owner described — one coach per domain, plus a coach per exercise type. Names and focus lines are
 * Legacy's own: Nutrition Expert, Running Coach, Sleep Coach, Longevity Guide, Strength Coach,
 * Cycling Coach, Swimming Coach, Golf Coach.
 *
 * NOT ported, and written here for the first time: `exercise`, `medical` and `resilience`. Legacy
 * has no umbrella exercise coach (it went straight to marathon/gym/cycle/swim/golf) and nothing that
 * answers for a diagnosed condition. Resilience was a Legacy DOMAIN but never had a coach of its own
 * — it was folded into a catch-all called `general`, and a hub whose coach is "general" would be the
 * only one that cannot say what it is for.
 *
 * The Body coach was deleted on 2026-08-19 with the Body hub. See `SEED_HUBS` for why.
 *
 * The hub is called Resilience, not Mind: the owner renamed it on 2026-08-03 to match Legacy, and
 * because the evidence under it is recovery — heart-rate variability and resting heart rate — which
 * "Mind" mis-described.
 *
 * Legacy's system prompts are deliberately not ported. They name a product and a scope that the spec
 * has not settled here, and a prompt is behaviour, not design — it belongs with the Gemini wiring.
 */
export const COACHES: readonly Coach[] = [
  { focus: 'Movement across everything you do.', id: 'exercise', name: 'Exercise Coach' },
  { focus: 'Nutrition, weight, and metabolic context.', id: 'nutrition', name: 'Nutrition Expert' },
  {
    focus: 'Conditions, medications, and symptoms over time.',
    id: 'medical',
    /**
     * **Not "Medical Coach", deliberately.** The hub was renamed to Health record on 2026-08-21 so
     * that nothing here claims a clinical function the app refuses to perform — `egfr.ts` and
     * `markerContext.ts` both have guards that fail the build if the copy diagnoses. A coach called
     * "Medical" undoes that from the other end: a person asking it a question would reasonably read
     * the answer as medical advice, which is the one thing it must never be taken for.
     *
     * "Guide" follows `longevity`, which made the same choice first.
     */
    name: 'Health Record Guide',
  },
  { focus: 'Recovery, and what your body has left in the tank.', id: 'resilience', name: 'Resilience Coach' },
  { focus: 'Long-term health patterns.', id: 'longevity', name: 'Longevity Guide' },
  { focus: 'Sleep rhythm and recovery habits.', id: 'sleep', name: 'Sleep Coach' },
  { focus: 'Training load, pacing, and recovery.', id: 'running', name: 'Running Coach' },
  { focus: 'Strength training and consistency.', id: 'strength', name: 'Strength Coach' },
  { focus: 'Cycling volume and progression.', id: 'cycling', name: 'Cycling Coach' },
  { focus: 'Swimming sessions and recovery.', id: 'swimming', name: 'Swimming Coach' },
  { focus: 'Golf practice and movement.', id: 'golf', name: 'Golf Coach' },
];

/**
 * The seeded hubs.
 *
 * The first five are the orbit, in ring order starting at the right and going clockwise — that order
 * is load-bearing for `src/ui/mockup/geometry.ts`.
 *
 * The rest live inside one of them: Labs inside Health record, and the five exercise types
 * inside Exercise. They are hubs like any other, not a special case — the owner asked to be able to
 * add exercise types the same way as hubs, so modelling them as anything else would mean writing the
 * creation flow twice.
 *
 * **The owner re-drew this list on 2026-08-19**, naming what he wanted: sleep, nutrition, exercise,
 * medical condition, resilience, running and gym, plus a `+` to add another. Four things followed:
 *
 * - **Activity is Exercise**, id included. The id moved because nothing was owed to the old one —
 *   `Activity Coach` was written here rather than ported from Legacy.
 * - **Medical condition is new**, and **Labs sits inside it** rather than beside it. Everything
 *   built for panels still runs through the hub id `labs`: `/add-panel`, the verification gate, and
 *   the PhenoAge number the Twin leads with. It is one tap further in, which is the price of the
 *   ring naming the domain rather than "labs" to someone who has never uploaded a panel.
 *
 *   **Renamed to "Health record" on 2026-08-21.** The label above is the name it was given on the
 *   day, kept here because that is what this section records. The hub id is still `medical` and
 *   always will be — see the note on it in `SEED_HUBS`.
 * - **Body is gone.** He did not name it, twice. Its weigh-in row moved into Nutrition, which is
 *   where weight sits next to what you eat; nothing real was lost, because every number in it was
 *   invented for layout review.
 * - **Running and Gym stay inside Exercise.** He considered putting them on the ring and decided
 *   against it, so Exercise remains the honest total of everything you move.
 *
 * The `+` on the ring is NOT in this list. It is not a hub — giving it a row here would give it a
 * coach, a cockpit and a route. `src/ui/mockup/Orbit.tsx` draws it as one more position.
 */
export const SEED_HUBS: readonly HubDefinition[] = [
  { coachId: 'exercise', id: 'exercise', label: 'Exercise', origin: 'builtIn' },
  { coachId: 'nutrition', id: 'nutrition', label: 'Nutrition', origin: 'builtIn' },
  {
    coachId: 'medical',
    /**
     * **The id stays `medical` and must never change.** It is the foreign key every stored entry
     * carries — `hub_entry.hub_id` — and there is deliberately no database constraint tying the two
     * together (see migration 4). Renaming this string would not fail a build, a test, or a
     * migration; it would silently orphan every condition, medication and blood panel a person had
     * ever saved, and they would open the hub to find it empty.
     *
     * A label is what a person reads. An id is what their data is attached to. The two are allowed
     * to disagree, and this is the second time they have — Labs kept its id when it moved inside
     * this hub on 2026-08-19 for exactly the same reason.
     */
    id: 'medical',
    label: 'Health record',
    origin: 'builtIn',
    ringLabel: 'Health',
  },
  { coachId: 'resilience', id: 'resilience', label: 'Resilience', origin: 'builtIn' },
  { coachId: 'sleep', id: 'sleep', label: 'Sleep', origin: 'builtIn' },

  /**
   * The sixth place on the ring. The owner moved it here from a button under the orbit — "on the
   * bottom should just be the chat bar", 2026-08-03 — and kept it there when he re-drew the ring on
   * 2026-08-19, so it survives every reshaping so far.
   *
   * It has no coach and no cockpit, and both absences are the point: it is the way to reach EVERY
   * coach, so giving it one of its own would make it a domain competing with the six. Tapping it
   * goes to the chat surface, which `src/app/hub/[id].tsx` routes without Home needing to know.
   */
  { id: 'open-table', label: 'Open Table', origin: 'builtIn', role: 'table' },

  /**
   * Blood panels, inside Health record. The nesting is the only thing that changed about Labs —
   * its id, its coach, its cockpit and `/add-panel` are all untouched, which is what keeps the
   * PhenoAge number on the Twin screen working through this move.
   */
  { coachId: 'longevity', id: 'labs', label: 'Labs', origin: 'builtIn', parentId: 'medical' },

];

/**
 * **The sports are coaches, not hubs — the owner's call, 2026-08-21.**
 *
 * Running, Gym, Cycling, Swimming and Golf used to ship as hubs inside Exercise. They were empty
 * rooms: EVERY session ever logged goes to `exercise` with the sport as a field on the payload, and
 * a sport hub had never received one. The only thing in them was a note from the first run saying
 * they had been named.
 *
 * Three reasons they stay out, strongest first:
 *
 * 1. **Sleep and Nutrition are domains; golf is an activity.** Putting golf on the ring beside
 *    Sleep says golf is as fundamental to a life as sleeping. The ring is a claim about what a life
 *    is made of, and every activity added weakens it.
 * 2. **The ring cannot take them.** `geometry.ts` stops being readable at nineteen places and
 *    shrinks circles to 21px. Seven is comfortable; twelve truncates the labels.
 * 3. **Splitting destroys the only question that matters.** "Am I moving enough" is answered by the
 *    heatmap, the body figure and the week strip, all of which read ONE hub. Across five they each
 *    show a sparse, discouraging picture and none shows the real one.
 *
 * What a sport is instead: a lens on Exercise, and a voice. `SPORT_COACHES` below is the list, and
 * which of them a person has is an entry on Exercise rather than a room of its own.
 */
export const SPORT_COACH_IDS: readonly string[] = [
  'running',
  'strength',
  'cycling',
  'swimming',
  'golf',
];

/** The hubs in the orbit: top level only. Exercise types live inside Activity, not on the ring. */
export function orbitHubs(hubs: readonly HubDefinition[] = SEED_HUBS): readonly HubDefinition[] {
  return hubs.filter((hub) => hub.parentId === undefined);
}

/** The hubs inside one hub. Empty for every hub that does not split, which is all but Activity. */
export function childHubs(
  parentId: HubId,
  hubs: readonly HubDefinition[] = SEED_HUBS,
): readonly HubDefinition[] {
  return hubs.filter((hub) => hub.parentId === parentId);
}

export function findHub(
  id: HubId,
  hubs: readonly HubDefinition[] = SEED_HUBS,
): HubDefinition | undefined {
  return hubs.find((hub) => hub.id === id);
}

export function findCoach(
  id: CoachId,
  coaches: readonly Coach[] = COACHES,
): Coach | undefined {
  return coaches.find((coach) => coach.id === id);
}

/**
 * The coach a hub opens. Returns undefined rather than falling back to a default coach: a hub
 * silently answered by the wrong coach is worse than a hub that says it has none, and the creation
 * flow is what guarantees a user-made hub gets one.
 */
/**
 * The hub a coach belongs to. The reverse of `coachForHub`, and the two must stay reverses.
 *
 * **This is what lets a hub's brief follow its coach into a conversation.** The chat surface is
 * reached by coaches and a thread id, not by hub — so deriving the hub from the coach is what makes
 * reopening yesterday's conversation from history keep the frame it was started in, rather than
 * losing it the moment you navigate away from the hub.
 *
 * Undefined where a coach belongs to no hub, or to more than one. More than one has never happened
 * and would be a catalog mistake; returning nothing is the safe reading of it, because a brief
 * applied to the wrong hub is worse than none.
 */
export function hubForCoach(
  coachId: string,
  hubs: readonly HubDefinition[] = SEED_HUBS,
): HubDefinition | undefined {
  const found = hubs.filter((hub) => hub.coachId === coachId);
  return found.length === 1 ? found[0] : undefined;
}

export function coachForHub(
  id: HubId,
  hubs: readonly HubDefinition[] = SEED_HUBS,
  coaches: readonly Coach[] = COACHES,
): Coach | undefined {
  const hub = findHub(id, hubs);
  if (hub?.coachId === undefined) return undefined;
  return findCoach(hub.coachId, coaches);
}

/**
 * How many circles the ring draws: every top-level hub, plus the `+`.
 *
 * The `+` is not a hub and is deliberately absent from `SEED_HUBS`, so the count of places on the
 * ring is not the count of hubs and never will be. It lives here rather than in `Orbit.tsx` for two
 * reasons: `HomeMockup` sizes the centre box against the same number — when the two disagreed, the
 * box was sized for a ring that did not exist — and this file has no React Native imports, so the
 * number can be asserted in bare Node.
 */
export function ringPlaceCount(hubs: readonly HubDefinition[] = SEED_HUBS): number {
  return orbitHubs(hubs).length + 1;
}

/** Whether this place on the ring is a domain hub rather than the Open Table. */
export function isDomainHub(hub: HubDefinition): boolean {
  return (hub.role ?? 'domain') === 'domain';
}

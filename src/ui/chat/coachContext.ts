/**
 * What the coaches are told, built from the same functions the screens draw from.
 *
 * **The governing rule, the owner's, 2026-08-22: a coach is told exactly what the screen shows, and
 * cannot know anything the person cannot see.** So there is no second summariser here. Every row
 * below comes out of a hub's own `cockpit.ts` — the same call, with the same arguments, that the
 * hub screen makes — and every facet out of `coverage.ts`.
 *
 * Two things fall out of that for free, and both are the reason it is worth the indirection:
 *
 * - **No number reaches the model that the app would not print.** Every value has already been
 *   through `application/format/metric.ts` before this file sees it. A creatinine stored as
 *   `0.8031674208144796` reaches a coach as `0.8 mg/dL`, because that is what the screen prints,
 *   and nothing here can undo it.
 * - **A coach cannot disagree with a screen.** If it says the typical night was 7h 4m, the person
 *   can tap Sleep and read 7h 4m. The alternative has already been paid for three times here: three
 *   components on the Nutrition screen once printed three different meal counts for the same meals.
 *
 * **This lives in `src/ui/` and not beside `prompt.ts`, and that is not a filing preference.**
 * `src/application/` may not import `src/ui/` — `application/hubs/hubs.ts` says so, and it is the
 * one dependency the layers exist to keep straight. The types it produces are declared in
 * `application/chat/context.ts` and are structural, so `CockpitPeriod` and `HubFacet` satisfy them
 * without either side importing the other. Same trick as `CoachDescriptor` in `src/core/chat.ts`.
 *
 * Pure: profile and entries in, facts out. No store, no clock, no React — so every claim it makes
 * can be asserted in bare Node, which is the reason `cockpit.ts`, `summaries.ts` and `firstRun.ts`
 * are all split the same way.
 */

import type { AboutThem, CoachContext, HubFacts } from '@/application/chat/context';
import { SPORT_HUB, sportCoachesFor } from '@/application/exercise/sportCoaches';
import { formatMeasured } from '@/application/format/metric';
import { ageFrom } from '@/application/profile/profile';
import type { HubEntry } from '@/core/hubs';
import type { Profile, Sex } from '@/core/profile';
import { exercisePeriods } from '@/ui/exercise/cockpit';
import { isDomainHub, type HubDefinition } from '@/ui/hubs/catalog';
import { coverageFor } from '@/ui/hubs/coverage';
import { isHeld, kindWords } from '@/ui/hubs/entryWords';
import type { CockpitPeriod } from '@/ui/hubs/hubState';
import { labsPeriods } from '@/ui/labs/cockpit';
import { nutritionPeriods } from '@/ui/meals/cockpit';
import { medicalPeriods } from '@/ui/medical/cockpit';
import { resiliencePeriods } from '@/ui/resilience/cockpit';
import { sleepPeriods } from '@/ui/sleep/cockpit';

/** Every hub's entries, keyed by hub id. The shape a caller reads out of the store. */
export type EntriesByHub = Readonly<Record<string, readonly HubEntry[]>>;

/**
 * The cockpit a hub draws, or none.
 *
 * The same switch `coverageFor` makes, over the same ids, and deliberately not merged with it: one
 * answers "what does this hub show" and the other "what can this hub see", and a hub can have
 * either without the other. A hub somebody made has neither, and says so below rather than here.
 */
function periodsFor(
  hubId: string,
  entries: readonly HubEntry[],
  now: string,
): readonly CockpitPeriod[] {
  switch (hubId) {
    case 'exercise':
      return exercisePeriods(entries, now);
    case 'labs':
      return labsPeriods(entries, now);
    case 'medical':
      return medicalPeriods(entries);
    case 'nutrition':
      return nutritionPeriods(entries, now);
    case 'resilience':
      return resiliencePeriods(entries, now);
    case 'sleep':
      return sleepPeriods(entries, now);
    default:
      /* A hub somebody invented has no cockpit written for it, and never will — that is what
         `catalog.ts` means by never keying on a literal hub id again. What it does have is the
         logged line below, which is the top of every hub screen including theirs. */
      return [];
  }
}

/**
 * "3 meals · 1 goal" — the line at the top of every hub screen.
 *
 * Re-derived rather than imported, because `countLine` is private to `StoredEntries.tsx` and a
 * `.tsx` file cannot be reached from a prompt or asserted in bare Node. What matters is that the
 * two share the vocabulary they are built from: `kindWords` and `isHeld` are the same functions
 * that screen calls, so a kind renamed there is renamed here.
 *
 * **`isHeld` is the half that is easy to miss.** A goal somebody turned off is written down rather
 * than deleted — nothing in OL1 deletes — and counting it read as "1 goal" to somebody who had just
 * turned their only goal off. A coach congratulating them on it would be the same defect, said out
 * loud.
 */
export function loggedLine(entries: readonly HubEntry[]): string | null {
  const byKind = new Map<string, number>();
  for (const entry of entries.filter(isHeld)) {
    byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
  }

  const parts = [...byKind.entries()].map(([kind, count]) => `${count} ${kindWords(kind, count)}`);
  return parts.length === 0 ? null : parts.join(' · ');
}

export function hubFacts(
  hub: HubDefinition,
  entries: readonly HubEntry[],
  now: string,
): HubFacts {
  const logged = loggedLine(entries);

  return {
    coverage: coverageFor(hub.id, entries, now) ?? [],
    label: hub.label,
    periods: [
      /* First, because it is the first thing on the hub screen, and because it is the only thing a
         hub with no cockpit can say about what is in it. */
      ...(logged === null
        ? []
        : [
            {
              label: 'What they have logged here',
              rows: [{ label: 'Entries', value: logged, when: 'all time' }],
            },
          ]),
      ...periodsFor(hub.id, entries, now),
    ],
  };
}

/**
 * How a sex is written down for a coach.
 *
 * **The third copy of these four labels in the repository**, and the reason is worth stating rather
 * than quietly adding it: the other two live inside `AboutYou.tsx` and `ProfileScreen.tsx`, neither
 * exports them, and a `.tsx` file cannot be imported into a prompt or asserted in bare Node. Lifting
 * all three into `settings.ts` is the right fix and belongs in a diff that owns those files.
 *
 * **"Rather not say" is reported, not omitted.** `firstRun.ts` is explicit that skipping is an
 * ANSWER and `preferNotToSay` is a real member of `Sex` meaning exactly "not answered". A coach told
 * nothing would reasonably ask again; a coach told they would rather not say knows not to.
 */
const SEX_WORDS: Readonly<Record<Sex, string>> = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  preferNotToSay: 'They would rather not say',
};

/**
 * What the first run asked, and what the profile holds.
 *
 * **This is the half no cockpit shows, and it is here because the owner asked for it on
 * 2026-08-22:** *"everything that is in the onboarding ALWAYS needs to be remembered by all
 * coaches."* Onboarding writes five things — a profile, a weigh-in, goals, named sports and free
 * text about what somebody lives with — and only the weigh-in reaches a cockpit. The other four
 * would have been invisible to every coach.
 *
 * **Age is derived, never stored**, for the reason `application/profile/profile.ts` gives: a stored
 * age is wrong from the next birthday onwards, and a coach repeating it would be wrong for a year.
 */
export function aboutThem(
  profile: Profile | null,
  entries: EntriesByHub,
  hubs: readonly HubDefinition[],
  now: Date,
): AboutThem {
  const age = ageFrom(profile?.birthYear ?? null, now);
  const height = profile?.heightCm ?? null;

  const label = new Map(hubs.map((hub) => [hub.id, hub.label]));

  const goals = hubs
    .flatMap((hub) =>
      (entries[hub.id] ?? [])
        .filter((entry) => entry.kind === 'goal' && isHeld(entry))
        .map((entry) => ({
          hub: label.get(hub.id) ?? hub.id,
          label: typeof entry.payload.label === 'string' ? entry.payload.label : '',
        })),
    )
    .filter((goal) => goal.label.trim().length > 0);

  /**
   * What somebody wrote under "anything you live with", and the two lines the flow writes beside it
   * for a microbiome or genetic result it cannot read.
   *
   * Both are `note` entries on Health record and nothing distinguishes them, so the heading in
   * `context.ts` claims only that this is free text on that hub — which is true of both. Calling
   * all of it "their own words" would put ours in their mouth.
   */
  const lives = (entries.medical ?? [])
    .filter((entry) => entry.kind === 'note')
    .map((entry) => (typeof entry.payload.text === 'string' ? entry.payload.text.trim() : ''))
    .filter((text) => text.length > 0);

  return {
    age: age === null ? null : formatMeasured(age, 'years'),
    goals,
    height: height === null ? null : formatMeasured(height, 'cm'),
    lives,
    sex: profile === null ? null : SEX_WORDS[profile.sex],
    sports: sportCoachesFor(entries[SPORT_HUB] ?? []).map((sport) => sport.label),
  };
}

/**
 * Everything, for every coach.
 *
 * **Every coach reads every hub — the owner's call, 2026-08-22:** *"all the data like the blood
 * panel is the basis of every coach … the data is the fundament of the advice of the coaches."*
 * There is deliberately no per-coach filtering here, and the file would be the wrong place for it
 * if there were: which hubs a coach may read is a product decision, and `docs/product-spec.md`
 * still lists it as open under *"whether hub selection weights the answer or restricts what the
 * coach may use"*. Narrowing it later is a filter on `hubs` at the call site, not a rewrite.
 *
 * **A hidden hub is left out.** Putting a hub away is a statement about what somebody wants to see,
 * and it would be a strange app that honoured that on the ring and ignored it when talking to a
 * coach — the same call `src/ui/twin/summaries.ts` makes for the Twin's domain cards. Nothing is
 * deleted either way; the entries are still there when the hub comes back.
 */
export function coachContext(input: {
  readonly entries: EntriesByHub;
  readonly hidden: readonly string[];
  readonly hubs: readonly HubDefinition[];
  readonly now: string;
  readonly profile: Profile | null;
}): CoachContext {
  const away = new Set(input.hidden);
  /**
   * Domain hubs only, and hidden ones dropped.
   *
   * `isDomainHub` keeps the Open Table out. It is a place on the ring rather than a hub — no coach,
   * no cockpit, and it holds nothing — so a block reading "Open Table: nothing logged in this hub
   * yet" would be reporting the absence of data from something that was never able to have any.
   */
  const shown = input.hubs.filter((hub) => isDomainHub(hub) && !away.has(hub.id));

  return {
    about: aboutThem(input.profile, input.entries, shown, new Date(input.now)),
    hubs: shown.map((hub) => hubFacts(hub, input.entries[hub.id] ?? [], input.now)),
  };
}

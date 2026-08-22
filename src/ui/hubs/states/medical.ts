import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * A new hub, named by the owner on 2026-08-19. **Labs sits inside it** rather than beside it on the
 * ring, so this cockpit answers for the domain and Labs answers for the panels.
 *
 * No week strip, and that is the point rather than an omission — the same argument `labs.ts` makes.
 * A condition is a standing fact and a medication is a daily one, but neither has a seven-day rhythm
 * worth drawing: a strip here would be seven identical days saying "still true".
 *
 * **Nothing here names a condition, a medication or a dose.** The fixtures rule is firmest about
 * exactly this: a public preview must not carry a diagnosis, and a plausible-looking one invites
 * being read as real. Counts and dates only — which is also what the screen would honestly show
 * before anything has been entered.
 */
export const medical: HubState = {
  basis: 'From what you have entered by hand. Nothing is read from a medical system.',
  /**
   * **The sample cockpit is gone, because a real one exists.**
   *
   * `src/ui/medical/RecordCockpit.tsx` lists what somebody typed. Unlike every other cockpit here
   * it LISTS rather than summarises: a week of meals is not worth reading item by item and a health
   * record is nothing but its items, so "3 conditions recorded" without the names would summarise
   * something nobody can see.
   *
   * Which also retires the reason this fixture had to be so careful. It could count and never name,
   * because a public preview must not carry a diagnosis; the real block names them because they are
   * the person's own words on their own device.
   */
  cockpit: {
    empty: 'Your own record fills the cockpit above this line. There is no invented one left here.',
    periods: [],
  },
  contribute: {
    /* Two real ways in, so the second is `also` rather than `secondary` — `secondary` is a caption
       sharing the primary's destination, which is why "Add a medication" led to the same screen. */
    also: { href: '/log-medication', label: 'Add a medication' },
    href: '/log-condition',
    note: 'Your words, kept as you wrote them. Nothing here is checked against anything.',
    primary: 'Record a condition',
    secondary: 'A name, whether it is current, and since when',
  },
  facets: [
    { detail: '1 recorded, entered by hand', label: 'Conditions', state: 'reading' },
    { detail: '2 recorded, entered by hand', label: 'Medications', state: 'reading' },
    { detail: 'Inside this hub, 1 panel', label: 'Blood panels', state: 'elsewhere' },
    { detail: 'Not connected yet', label: 'Symptoms over time', state: 'missing' },
    { detail: 'Not connected yet', label: 'Appointments and letters', state: 'missing' },
  ],
};

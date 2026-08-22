import type { HubState } from '../hubState';

/**
 * FIXTURE — invented for layout review. See the header of `../hubState.ts`.
 *
 * Three rules carried over from Legacy's `data/home/sleepRingModel.ts`, which records them as owner
 * decisions from 2026-07-27. They were re-derived worse here before anyone read that file:
 *
 * 1. **Attribution.** A deep/light/REM breakdown is the VENDOR's claim, not ours — the app does not
 *    compute stages, the watch does. Health Connect is *the pipe, not the measurer*, and naming it
 *    as the source would be re-badging. Without a nameable vendor there is no breakdown to show,
 *    only total duration, which needs no attribution because it is nobody's interpretation. That is
 *    why the stages facet below is missing rather than merely "not connected".
 * 2. **Denominator.** Time in bed includes awake; time asleep does not. Every number here is time
 *    ASLEEP, and nothing may describe a share "of your sleep" unless it really excludes awake.
 * 3. **No order.** Nothing may imply a chronology of the night. The seven-day strip is seven nights
 *    side by side, never a shape within one night.
 *
 * Legacy also keeps a night that never arrived ('missing') distinct from a read that failed
 * ('error') the whole way through. This fixture has no error state to show, but the distinction is
 * why Friday reads as "not worn" rather than as zero.
 */
export const sleep: HubState = {
  basis: 'From the nights you have typed in. No watch is connected.',
  /**
   * **The sample cockpit is gone, because a real one exists.**
   *
   * `src/ui/sleep/NightCockpit.tsx` reads the nights somebody logged. What went with the invented
   * rows is the claim underneath them: this fixture said six of the last seven nights were
   * "recorded by your watch", and there is no watch — the phone and everything on it are still
   * deferred. Sleep is the domain people most expect a device to have measured for them, which is
   * exactly why a placeholder implying one was the worst place to leave that impression.
   *
   * The bed and wake times went too. `night.ts` says why they are not asked for yet, and a cockpit
   * cannot report what nobody typed.
   */
  cockpit: {
    empty: 'Your own nights fill the cockpit above this line. There is no invented one left here.',
    periods: [],
  },
  contribute: {
    href: '/log-night',
    note: 'Connecting a watch waits for the phone. Typing a night in does not.',
    primary: 'Add a night by hand',
    secondary: 'How long you slept, and which night it was',
  },
  facets: [
    /**
     * **A facet is a claim about what this hub can read, and two of these were wrong.**
     *
     * "Time asleep" is real now — typed in, not measured — so it says which. "Rhythm" was reading
     * bed and wake times from nothing at all: `night.ts` deliberately does not ask for them, and
     * nothing else in the app records one. A facet claiming a capability the app does not have is
     * the same defect as a cockpit row claiming a number it cannot produce.
     */
    { detail: 'The nights you have typed in', label: 'Time asleep', state: 'reading' },
    { detail: 'Bed and wake times are not asked for yet', label: 'Rhythm', state: 'missing' },
    { detail: 'Shared with Resilience', label: 'Resting heart rate', state: 'elsewhere' },
    { detail: 'Needs a watch that names itself', label: 'Sleep stages', state: 'missing' },
  ],
};

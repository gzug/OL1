/**
 * What the twin reads, besides a blood panel — and how much of any of it is arriving.
 *
 * **This used to live in `src/ui/mockup/fixtures.ts`, and it was the last thing in it.** When the
 * invented content came off the Twin on 2026-08-22, one export was left behind, and it was not a
 * fixture: three rows saying nothing is connected, which is true. A file whose header reads
 * *invented for layout review, never values* holding nothing but the app's real state is the same
 * defect the clean-up was for, one level up. So it moved here and `fixtures.ts` was deleted.
 *
 * **It is a hard-coded truth, which is a clock that has not started ticking yet.** Shape 4 of
 * `docs/decisions/0013`: it is correct today because no wearable, genome or microbiome can be
 * connected at all — there is no Health Connect on the phone yet, no import for either of the other
 * two, and nowhere to put what they would say. The day any one of them connects, this list becomes
 * a lie without anybody editing it, and the diff that connects it will not touch this file.
 *
 * So the rule that comes with it: **whoever wires a source up changes this in the same commit**, and
 * the honest version of that is to derive the state from whatever does the connecting rather than to
 * edit a string here. There is nothing to derive from yet, which is the only reason it is a literal.
 *
 * Blood work is deliberately NOT here. It is the one source that feeds the biological age, so it
 * comes from that number's own state — `bloodWorkSource` in `bioAgeCopy.ts`. A row here claiming
 * nine of nine markers, directly under a line saying no panel had been added, is exactly the
 * contradiction that reaching the deployed preview made obvious.
 */

export type TwinSource = {
  readonly detail: string;
  readonly label: string;
  /** `reading` means something is actually arriving. Nothing here is, and nothing can be. */
  readonly state: 'missing' | 'reading';
};

export const twinSources: readonly TwinSource[] = [
  { detail: 'Not connected yet', label: 'Wearable', state: 'missing' },
  { detail: 'Not connected yet', label: 'Genomics', state: 'missing' },
  { detail: 'Not connected yet', label: 'Microbiome', state: 'missing' },
];

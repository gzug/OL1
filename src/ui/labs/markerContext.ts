/**
 * What each marker on a panel actually is, in plain language.
 *
 * **PORTED IN PART from Legacy `data/markerContext.ts`**, and its rules are ported in full even
 * where its content could not be. Legacy states them at the top of that file and they are the whole
 * reason it is safe to ship:
 *
 * - no diagnosis
 * - no treatment advice
 * - no "you should" / "you need" / "this means you have"
 * - no risk prediction
 *
 * `tests/marker-context.test.ts` enforces them mechanically rather than trusting a careful author,
 * because AGENTS.md is right that a rule worth having is a check.
 *
 * **Legacy's catalogue only covers three of our nine markers.** Its eighteen entries are lipids and
 * hormones — the panel an athlete orders — and ours are the nine LEVINE markers, chosen because the
 * PhenoAge calculation takes them. Glucose, CRP and creatinine are Legacy's own words, trimmed of
 * the athlete framing. The other six are written here for the first time, inside the same rules.
 *
 * **`why` is ours and is not in Legacy at all.** Our markers are on the panel because a published
 * age calculation needs them, not because somebody judged them the most interesting nine in blood.
 * Saying so is the difference between a screen that explains itself and one that implies these are
 * the numbers that matter most about a person. They are not; they are the numbers one formula reads.
 */

import type { LevineMarkerKey } from './levine';

export type MarkerContext = {
  /** What it is usually read next to. Never a rule about what to do. */
  readonly alongside: string;
  readonly key: LevineMarkerKey;
  /** What the marker is. Descriptive, physiological, and about nobody in particular. */
  readonly what: string;
  /** Why it is on THIS panel. Ours, not Legacy's — see the note above. */
  readonly why: string;
};

export const MARKER_CONTEXT: readonly MarkerContext[] = [
  {
    alongside: 'Liver and kidney markers, and how much protein is in the diet.',
    key: 'albumin',
    what: 'The most abundant protein in blood plasma, made by the liver.',
    why: 'One of the nine values the biological age calculation reads.',
  },
  {
    alongside: 'Bone and liver markers on the same panel.',
    key: 'alp',
    what: 'Alkaline phosphatase, an enzyme found mostly in liver and bone.',
    why: 'One of the nine values the biological age calculation reads.',
  },
  {
    // Legacy's own words, minus its athlete framing.
    alongside: 'Hydration, muscle mass, and other kidney markers.',
    key: 'creatinine',
    what: 'A waste product of muscle metabolism, used to assess kidney filtration.',
    why: 'One of the nine values the biological age calculation reads.',
  },
  {
    // Legacy's `hscrp` entry, which is the same marker under a different key.
    alongside: 'Recent illness, training load, and sleep.',
    key: 'crp',
    what: 'A general marker of inflammation. Not specific to any one cause.',
    why: 'One of the nine values the biological age calculation reads, and the one that moves most from week to week.',
  },
  {
    // Legacy's own words.
    alongside: 'What was eaten beforehand, and how long the fast was.',
    key: 'glucose',
    what: 'Fasting blood glucose. A snapshot of blood sugar regulation.',
    why: 'One of the nine values the biological age calculation reads.',
  },
  {
    alongside: 'The white cell count it is a share of.',
    key: 'lymph_pct',
    what: 'The share of white blood cells that are lymphocytes, one of the immune system’s cell types.',
    why: 'One of the nine values the biological age calculation reads. It is a proportion, so it moves when any other white cell type does.',
  },
  {
    alongside: 'Red cell width, and iron and B12 markers when they are on the panel.',
    key: 'mcv',
    what: 'Mean corpuscular volume — the average size of a red blood cell.',
    why: 'One of the nine values the biological age calculation reads.',
  },
  {
    alongside: 'Average red cell size, which it is the spread around.',
    key: 'rdw',
    what: 'Red cell distribution width — how much red blood cells vary in size from each other.',
    why: 'One of the nine values the biological age calculation reads.',
  },
  {
    alongside: 'The lymphocyte share, and any recent illness.',
    key: 'wbc',
    what: 'The number of white blood cells, the cells of the immune system.',
    why: 'One of the nine values the biological age calculation reads.',
  },
];

export function markerContext(key: LevineMarkerKey): MarkerContext | undefined {
  return MARKER_CONTEXT.find((entry) => entry.key === key);
}

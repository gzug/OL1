/**
 * What the number was worked out from, line by line.
 *
 * The owner asked for this directly: *"Maybe we add an information icon that when the user clicks
 * it it gives an explanation how it was calculated and which values from the blood panel have been
 * used?"* — asked on the day OL1's answer disagreed with an app he pays for, which is exactly when
 * a person needs to see the inputs rather than be told the output is fine.
 *
 * A plain `.ts` beside `bioAgeCopy.ts`, for the same reason: this is the honesty of the screen and
 * it has to be assertable in bare Node.
 *
 * **Every row is derived from `PanelInputs`, which the calculation carried out with it.** Nothing
 * here re-reads the store, so the explanation cannot describe a different panel than the one the
 * number came from.
 */

import { CRP_FLOOR_MGL, crpAsModelled } from '@/application/labs/phenoAge';
import { TARGET_UNIT, normUnit } from '@/application/labs/units';
import type { PanelInputs } from '@/application/twin/bioAge';
import { LEVINE_MARKERS, isLevineKey } from '@/ui/labs/levine';

export type MethodRow = {
  /** What the formula actually read, already in `unit`. */
  readonly asRead: number;
  /** Set when the formula did not read the value as given, and says why in one clause. */
  readonly adjustment: string | null;
  readonly key: string;
  readonly label: string;
  /** How the laboratory printed it, when that differed from the formula's unit. */
  readonly asEntered: string | null;
  readonly unit: string;
};

/** Two decimals at most, and no trailing zeroes — `4.4`, not `4.40`, and `1.17`, not `1.1652`. */
function tidy(value: number): number {
  return Math.round(value * 100) / 100;
}

export function methodRows(used: PanelInputs): readonly MethodRow[] {
  return LEVINE_MARKERS.filter((marker) => used.markers[marker.key] !== undefined).map((marker) => {
    const stored = used.markers[marker.key] as number;
    const entered = used.unitsAsEntered[marker.key];
    /* `LEVINE_MARKERS` is the nine, so this key is always in `TARGET_UNIT`. The narrowing is here
       rather than a cast because the day a tenth marker joins the formula, this must not compile. */
    const target = isLevineKey(marker.key) ? TARGET_UNIT[marker.key] : marker.unit;
    const swapped = entered !== undefined && normUnit(entered) !== normUnit(target);

    /**
     * CRP is the one place the formula deliberately reads something other than what was measured.
     * Saying so here is the whole point of the screen — `docs/decisions/0012-the-crp-floor.md` is
     * the reasoning, and a number silently different from the one on a person's report is precisely
     * what an explanation exists to prevent.
     */
    const floored = marker.key === 'crp' && crpAsModelled(stored) !== stored;

    return {
      asRead: tidy(floored ? CRP_FLOOR_MGL : stored),
      adjustment: floored
        ? `Your result was ${tidy(stored)} ${marker.unit}. The formula reads it at ${CRP_FLOOR_MGL}, the lowest CRP it was built on.`
        : null,
      asEntered: swapped ? `entered in ${entered}` : null,
      key: marker.key,
      label: marker.label,
      unit: marker.unit,
    };
  });
}

/** How the number is made, in the fewest words that are still true. */
export const METHOD_EXPLANATION = [
  'Nine blood markers and your age go into a formula published by researchers at Yale in 2018, called PhenoAge. It was built by finding which routine blood results best predicted mortality across a large population, and reading them back as an age.',
  'A result below your real age means those markers look like a younger person’s. It is a reading of one blood draw, not a verdict on you, and it moves.',
] as const;

/**
 * What the method cannot do. This is not a disclaimer — it is the part a person needs in order to
 * read the number correctly, so it sits with the explanation rather than in small print under it.
 */
export const METHOD_LIMITS = [
  'It comes from one blood draw. A single panel is a reading; two panels are a direction.',
  'It is a population average applied to one person. It cannot know anything about you that is not in these nine numbers.',
  `The model was built on an older, less sensitive CRP test that could not measure below ${CRP_FLOOR_MGL} mg/L. A very low modern CRP is read at that floor, so the number cannot reward inflammation lower than the model has ever seen.`,
] as const;

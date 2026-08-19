/**
 * A logged meal, and the checks around it.
 *
 * The shape is PORTED from Legacy `services/CoachService.ts` — `NutritionExtractionResult`: an
 * estimate of calories and macros, a list of items, and a confidence. Three of Legacy's decisions
 * are carried over deliberately, because each one is a rule about honesty rather than a field:
 *
 * 1. **Fibre may be null and must never be fabricated.** Legacy's parser says so in a comment on the
 *    line that drops it: "fiber stays null when absent or invalid - honesty rule, never fabricate".
 *    A macro the model could not read has to stay unknown rather than become a zero.
 * 2. **The note overrides the photo.** Legacy's prompt is explicit: the user's note MUST override
 *    visual portions or add hidden ingredients. A photo cannot see the oil in the pan, and a flow
 *    that treats the picture as the whole truth is confidently wrong about most cooked food.
 * 3. **Confidence is the model's, and it is shown.** high / med / low, surfaced rather than hidden,
 *    so a low-confidence estimate is not read with the same weight as a high one.
 *
 * NOT from Legacy: `macrosAgree` below. Legacy has no arithmetic cross-check, and this one is new —
 * argued in the PR. It is a WARNING and never a block, because a mixed dish genuinely can miss by a
 * wide margin and refusing the log would be worse than flagging it.
 *
 * Nothing here is a nutrition claim, a target, or advice. It records what the user says they ate.
 */

export type Confidence = 'high' | 'low' | 'med';

/** One thing in the meal. `wholeFood` is Legacy's own flag, and it is the user's call, not ours. */
export type MealItem = {
  readonly name: string;
  readonly wholeFood: boolean;
};

export type MacroKey = 'calories' | 'carbsGrams' | 'fatGrams' | 'fiberGrams' | 'proteinGrams';

export type MacroDefinition = {
  readonly key: MacroKey;
  readonly label: string;
  /** Beyond this a number is a typo or a wrong unit, not a meal. Not a target and not a limit. */
  readonly sane: { readonly max: number; readonly min: number };
  readonly unit: string;
};

export const MACROS: readonly MacroDefinition[] = [
  { key: 'calories', label: 'Calories', sane: { max: 5000, min: 0 }, unit: 'kcal' },
  { key: 'proteinGrams', label: 'Protein', sane: { max: 500, min: 0 }, unit: 'g' },
  { key: 'carbsGrams', label: 'Carbohydrate', sane: { max: 800, min: 0 }, unit: 'g' },
  { key: 'fatGrams', label: 'Fat', sane: { max: 400, min: 0 }, unit: 'g' },
  { key: 'fiberGrams', label: 'Fibre', sane: { max: 200, min: 0 }, unit: 'g' },
];

export type MacroEntry = {
  readonly key: MacroKey;
  /** Kept as text, so a half-typed number is never silently a different one. */
  readonly text: string;
};

export type MacroProblem = 'notANumber' | 'outsideSane';

/** An empty macro is not a problem. Fibre especially — Legacy's honesty rule is that it may be unknown. */
export function macroProblem(macro: MacroDefinition, text: string): MacroProblem | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return 'notANumber';
  if (value < macro.sane.min || value > macro.sane.max) return 'outsideSane';

  return null;
}

export function problemMessage(macro: MacroDefinition, problem: MacroProblem): string {
  switch (problem) {
    case 'notANumber':
      return 'That is not a number.';
    case 'outsideSane':
      return `Outside ${macro.sane.min}–${macro.sane.max} ${macro.unit} for one meal.`;
  }
}

export function macroProblems(entries: readonly MacroEntry[]): readonly MacroKey[] {
  return MACROS.filter((macro) => {
    const entry = entries.find((candidate) => candidate.key === macro.key);
    return entry !== undefined && macroProblem(macro, entry.text) !== null;
  }).map((macro) => macro.key);
}

function valueOf(entries: readonly MacroEntry[], key: MacroKey): number | null {
  const text = entries.find((entry) => entry.key === key)?.text.trim() ?? '';
  if (text.length === 0) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/**
 * Whether the calories roughly match the macros, at 4/4/9 kcal per gram.
 *
 * NOT from Legacy — new here. A quarter tolerance is deliberately loose: alcohol is not in the
 * formula, fibre is partly unavailable, and rounding on five numbers compounds. It is meant to catch
 * a decimal point in the wrong place, not to audit anybody's lunch.
 *
 * Returns null when there is not enough filled in to judge, which is the common case.
 */
export function macrosAgree(entries: readonly MacroEntry[]): boolean | null {
  const calories = valueOf(entries, 'calories');
  const protein = valueOf(entries, 'proteinGrams');
  const carbs = valueOf(entries, 'carbsGrams');
  const fat = valueOf(entries, 'fatGrams');

  if (calories === null || protein === null || carbs === null || fat === null) return null;
  if (calories === 0) return protein + carbs + fat === 0;

  const implied = protein * 4 + carbs * 4 + fat * 9;
  return Math.abs(implied - calories) <= calories * 0.25;
}

export function filledCount(entries: readonly MacroEntry[]): number {
  return entries.filter((entry) => entry.text.trim().length > 0).length;
}

/**
 * What is stored when a meal is logged.
 *
 * **An unfilled macro is absent, not zero**, and that is the structural version of Legacy's fibre
 * rule: "fiber stays null when absent or invalid - honesty rule, never fabricate". A zero would be
 * a claim that the meal contained none, and a week of averages built on those zeros would be quietly
 * wrong in the direction that flatters. Absent stays absent all the way through.
 *
 * Pure, and here rather than in the screen, so what gets written can be asserted without rendering
 * anything — the same reason every rule in this file is a function.
 */
export function mealPayload(
  entries: readonly MacroEntry[],
  note: string,
): Readonly<Record<string, unknown>> {
  const macros: Record<string, number> = {};

  for (const macro of MACROS) {
    const text = entries.find((entry) => entry.key === macro.key)?.text.trim() ?? '';
    if (text.length === 0) continue;
    if (macroProblem(macro, text) !== null) continue;
    macros[macro.key] = Number(text);
  }

  const trimmed = note.trim();
  return { macros, ...(trimmed.length === 0 ? {} : { note: trimmed }) };
}

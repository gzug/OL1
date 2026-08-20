/**
 * How well a week of logging went — not how well the person is doing.
 *
 * **PORTED from Legacy `data/nutrition/nutritionScore.ts`**: the three sub-scores and their weights,
 * the targets they measure against, and the coverage rule behind the confidence label. All of it is
 * Legacy's, and `docs/decisions/0009-a-score-for-the-week-not-the-person.md` argues why a score is
 * allowed here at all when `0004` and `0005` rejected grading.
 *
 * The honest part, and the reason this is worth porting rather than inventing: **a sub-score can be
 * absent, and the weights renormalise over what is actually there.** Nothing is assumed to be zero
 * because it was not recorded. A week with no fibre logged is scored on protein alone and says so.
 */

export type Confidence = 'high' | 'low' | 'med';

export type SubScores = {
  /** Fibre per 1000 kcal against the target. Null when no meal recorded both. */
  readonly fiber: number | null;
  /** Protein as a share of energy against the target. Null when no meal recorded both. */
  readonly protein: number | null;
  /**
   * Share of calories from whole or minimally processed food.
   *
   * **Always null here today**, and deliberately: our meal flow records macros and a note, not a
   * list of items with a processing level. Legacy's vision extraction produced those items; ours
   * does not exist yet. Keeping the slot means the score gains a third part the day it does, rather
   * than the weights being rewritten then.
   */
  readonly wholeFood: number | null;
};

export type NutritionScore = {
  readonly confidence: Confidence;
  readonly loggedDays: number;
  readonly loggedMeals: number;
  /** 0–100, or null when there is not enough logging to say anything at all. */
  readonly quality: number | null;
  readonly subScores: SubScores;
};

/** Legacy's own numbers. Not medical guidance — the reference points its score was written against. */
export const PROTEIN_TARGET_ENERGY_SHARE = 0.18;
export const FIBER_TARGET_PER_1000_KCAL = 14;

/** Legacy's weights. Protein first, fibre second, whole food last. */
export const WEIGHTS = { fiber: 0.35, protein: 0.4, wholeFood: 0.25 } as const;

/** Below this the score is withheld entirely — three meals is not a week of eating. */
export const MIN_MEALS = 3;

type Macros = Readonly<Record<string, unknown>>;

export type ScoredMeal = {
  readonly payload: Readonly<Record<string, unknown>>;
  readonly recordedAt: string;
};

function positive(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function macrosOf(meal: ScoredMeal): Macros {
  const macros = meal.payload.macros;
  return typeof macros === 'object' && macros !== null ? (macros as Macros) : {};
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * A ratio scored against a target, over the meals that recorded BOTH numbers.
 *
 * Meals that recorded only one are skipped rather than counted as zero — the same rule the stored
 * payload follows, carried through the arithmetic instead of being quietly lost in it.
 */
function ratioScore(
  meals: readonly ScoredMeal[],
  key: string,
  perCalorie: (total: number, calories: number) => number,
): number | null {
  let calories = 0;
  let total = 0;

  for (const meal of meals) {
    const macros = macrosOf(meal);
    const mealCalories = positive(macros.calories);
    const value = positive(macros[key]);
    if (mealCalories === null || value === null) continue;
    calories += mealCalories;
    total += value;
  }

  if (calories <= 0 || total <= 0) return null;
  return clamp(perCalorie(total, calories) * 100);
}

/**
 * Legacy's coverage rule, unchanged: ten meals across five days to be confident, five across three
 * to be middling. It measures how much was LOGGED, never how good the eating was — a perfect week
 * recorded twice is still Low.
 */
export function confidenceFor(loggedMeals: number, loggedDays: number): Confidence {
  if (loggedMeals >= 10 && loggedDays >= 5) return 'high';
  if (loggedMeals >= 5 && loggedDays >= 3) return 'med';
  return 'low';
}

export function confidenceSentence(score: NutritionScore): string {
  switch (score.confidence) {
    case 'high':
      return `From ${score.loggedMeals} meals across ${score.loggedDays} days — enough to mean something.`;
    case 'med':
      return `From ${score.loggedMeals} meals across ${score.loggedDays} days — a partial picture.`;
    case 'low':
      return `From ${score.loggedMeals} meals across ${score.loggedDays} days — too little to lean on.`;
  }
}

export function nutritionScore(meals: readonly ScoredMeal[]): NutritionScore {
  const loggedDays = new Set(meals.map((meal) => meal.recordedAt.slice(0, 10))).size;

  const subScores: SubScores = {
    fiber: ratioScore(meals, 'fiberGrams', (total, calories) =>
      (total / calories) * 1000 / FIBER_TARGET_PER_1000_KCAL,
    ),
    protein: ratioScore(meals, 'proteinGrams', (total, calories) =>
      (total * 4) / calories / PROTEIN_TARGET_ENERGY_SHARE,
    ),
    // No items, no processing level, no honest answer. See the note on the type.
    wholeFood: null,
  };

  // Renormalised over the parts that exist. A missing part is missing, never a zero.
  let weighted = 0;
  let weight = 0;
  for (const key of ['fiber', 'protein', 'wholeFood'] as const) {
    const value = subScores[key];
    if (value === null) continue;
    weighted += value * WEIGHTS[key];
    weight += WEIGHTS[key];
  }

  const quality = weight > 0 ? clamp(weighted / weight) : null;

  return {
    confidence: confidenceFor(meals.length, loggedDays),
    loggedDays,
    loggedMeals: meals.length,
    quality: meals.length >= MIN_MEALS ? quality : null,
    subScores,
  };
}

/** Which parts the score was actually made of, for the sentence that has to admit it. */
export function partsUsed(score: NutritionScore): readonly string[] {
  const names: Record<keyof SubScores, string> = {
    fiber: 'fibre',
    protein: 'protein',
    wholeFood: 'whole food',
  };
  return (Object.keys(names) as (keyof SubScores)[])
    .filter((key) => score.subScores[key] !== null)
    .map((key) => names[key]);
}

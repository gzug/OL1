/**
 * The nine Levine markers, and the two gates around them.
 *
 * PORTED verbatim from Legacy `data/health/labSchema.ts` — keys, labels, target units and
 * physiological sanity ranges. Legacy calls this the **Clinical Safety Gate**, and the ranges are
 * not reference ranges: they are the limits outside which a number is almost certainly a
 * misread unit or a typo rather than a person. Nothing here says whether a value is healthy, and
 * nothing here may ever start to.
 *
 * The second gate is the **Verification Gate**: an extracted panel is stored `isApproved = false`
 * and reaches nothing until the user has reviewed every marker. That is the part of Legacy worth
 * copying most carefully — OCR output is never trusted, and neither is a vision model's.
 *
 * These are marker DEFINITIONS, not anybody's results. The repository is public and no value is
 * shipped: the flow starts every marker empty, which is exactly what Legacy's
 * `createManualPendingResult` does.
 */

/**
 * The marker vocabulary and the unit each one must be in come from `application/labs/units.ts`,
 * which is also where the conversion factors live. One definition, so a screen and a calculation
 * cannot disagree about what `mg/dL` means.
 */
import {
  TARGET_UNIT,
  extraToTargetUnit,
  toTargetUnit,
  type ExtraUnitKey,
  type LevineMarkerKey,
} from '@/application/labs/units';

/**
 * Whether a key is one of the nine the formula reads, which decides its conversion table.
 *
 * Derived from `TARGET_UNIT` rather than listed again — a tenth marker added to the formula would
 * otherwise be validated against the wrong table until somebody remembered this line.
 */
function isLevineKey(key: ExtraUnitKey | LevineMarkerKey): key is LevineMarkerKey {
  return Object.prototype.hasOwnProperty.call(TARGET_UNIT, key);
}

export type { LevineMarkerKey };

/**
 * A marker a panel screen can put on the page.
 *
 * **Widened from `LevineMarkerKey` on 2026-08-21**, so the same row, the same validation and the
 * same unit toggle serve a lipid as serve albumin. The nine and the rest stay separate lists and
 * separate unions everywhere else — that separation is what keeps a lipid out of
 * `computePhenoAge`. What they share is being a number somebody types off a report, and writing a
 * second row component for that would be two places for one bug to live.
 */
export type PanelMarkerKey = ExtraUnitKey | LevineMarkerKey;

export type MarkerDefinition = {
  readonly key: PanelMarkerKey;
  readonly label: string;
  /** Outside this a number is a misread unit or a typo, not a person. Not a reference range. */
  readonly sane: { readonly max: number; readonly min: number };
  readonly unit: string;
};

/** Order is Legacy's own, and it is the order a panel is reviewed in. */
export const LEVINE_MARKERS: readonly MarkerDefinition[] = [
  { key: 'albumin', label: 'Albumin', sane: { max: 7, min: 1 }, unit: TARGET_UNIT.albumin },
  { key: 'creatinine', label: 'Creatinine', sane: { max: 15, min: 0.1 }, unit: TARGET_UNIT.creatinine },
  { key: 'glucose', label: 'Glucose', sane: { max: 600, min: 20 }, unit: TARGET_UNIT.glucose },
  { key: 'crp', label: 'C-reactive Protein', sane: { max: 500, min: 0.01 }, unit: TARGET_UNIT.crp },
  { key: 'lymph_pct', label: 'Lymphocyte Percentage', sane: { max: 99, min: 1 }, unit: TARGET_UNIT.lymph_pct },
  { key: 'mcv', label: 'Mean Cell Volume', sane: { max: 150, min: 50 }, unit: TARGET_UNIT.mcv },
  { key: 'rdw', label: 'Red Cell Distribution Width', sane: { max: 30, min: 5 }, unit: TARGET_UNIT.rdw },
  { key: 'alp', label: 'Alkaline Phosphatase', sane: { max: 1000, min: 10 }, unit: TARGET_UNIT.alp },
  { key: 'wbc', label: 'White Blood Cell Count', sane: { max: 100, min: 0.1 }, unit: TARGET_UNIT.wbc },
];

/** How a panel got here. Legacy keeps manual drafts distinguishable from imports; so does this. */
export type LabSource = 'file' | 'manual' | 'photo';

export type MarkerEntry = {
  readonly key: LevineMarkerKey;
  /** What the user typed, kept as text so a half-typed number is not silently a different one. */
  readonly text: string;
};

export type MarkerProblem = 'notANumber' | 'outsideSane';

/**
 * What is wrong with one entry, or null. An empty field is NOT a problem — Legacy allows a marker to
 * be skipped, because a panel that does not include a marker is ordinary and forcing a number would
 * invite an invented one.
 */
export function markerProblem(
  marker: MarkerDefinition,
  text: string,
  unit: string = marker.unit,
): MarkerProblem | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const typed = Number(trimmed);
  if (!Number.isFinite(typed)) return 'notANumber';

  /**
   * Checked in the unit the FORMULA reads, not the one being typed.
   *
   * A European panel's albumin of 45 g/L is 4.5 g/dL and perfectly ordinary; checking 45 against
   * the g/dL range would reject a normal result. Converting first is what lets somebody type the
   * number exactly as their laboratory printed it.
   */
  /* Each key's own conversion table. The two are separate because the unions are — a lipid uses
     `extraToTargetUnit`, and cholesterol and triglycerides do not even share a factor. */
  const value = isLevineKey(marker.key)
    ? toTargetUnit(marker.key, typed, unit)
    : extraToTargetUnit(marker.key, typed, unit);
  if (value === null) return 'notANumber';
  if (value < marker.sane.min || value > marker.sane.max) return 'outsideSane';

  return null;
}

export function problemMessage(marker: MarkerDefinition, problem: MarkerProblem): string {
  switch (problem) {
    case 'notANumber':
      return 'That is not a number.';
    case 'outsideSane':
      return `Outside ${marker.sane.min}–${marker.sane.max} ${marker.unit}. Check the unit on your report.`;
  }
}

/** A panel cannot have been drawn in the future. Legacy's `isValidLabTestDate`, same rule. */
export function isValidTestDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (value > today) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Markers with something in them. What "review" is counted against.
 *
 * **Counted against a given list, defaulting to the nine.** A panel screen holds seventeen rows
 * now, and counting all of them against "of 9" would print "12 of 9 filled" the moment somebody
 * typed a lipid — a label describing a screen that had changed underneath it.
 */
export function filledCount(
  entries: readonly MarkerEntry[],
  markers: readonly MarkerDefinition[] = LEVINE_MARKERS,
): number {
  const wanted = new Set(markers.map((marker) => marker.key));
  return entries.filter((entry) => wanted.has(entry.key as never) && entry.text.trim().length > 0)
    .length;
}

/** Every problem in the panel, so approval can be blocked on all of them rather than the first. */
export function panelProblems(
  entries: readonly MarkerEntry[],
  units: Readonly<Record<string, string>> = {},
  /** Which markers to check. Defaults to the nine, so existing callers are unchanged. */
  markers: readonly MarkerDefinition[] = LEVINE_MARKERS,
): readonly PanelMarkerKey[] {
  return markers.filter((marker) => {
    const entry = entries.find((candidate) => candidate.key === marker.key);
    if (entry === undefined) return false;
    return markerProblem(marker, entry.text, units[marker.key] ?? marker.unit) !== null;
  }).map((marker) => marker.key);
}

/**
 * What is stored when a panel is approved.
 *
 * **A marker left blank is absent, not zero** — the same rule `mealPayload` follows, and it matters
 * more here: a zero albumin is not a missing reading, it is an impossible one, and the PhenoAge
 * calculator would take it. Absent is what lets that calculator return a RANGE rather than a number
 * it cannot stand behind.
 *
 * `approvedAt` is recorded because the Verification Gate is the point of this screen. A panel that
 * reached storage without a person confirming it would be indistinguishable from one that did, and
 * this field is what tells them apart later.
 */
export function panelPayload(
  entries: readonly MarkerEntry[],
  source: LabSource,
  approvedAt: string,
  units: Readonly<Record<string, string>> = {},
  /** Which markers to write. Defaults to the nine, so existing callers are unchanged. */
  markers: readonly MarkerDefinition[] = LEVINE_MARKERS,
): Readonly<Record<string, unknown>> {
  const stored: Record<string, number> = {};

  for (const marker of markers) {
    const entry = entries.find((item) => item.key === marker.key);
    const text = entry?.text.trim() ?? '';
    if (text.length === 0) continue;

    const unit = units[marker.key] ?? marker.unit;
    if (markerProblem(marker, text, unit) !== null) continue;

    /**
     * Stored in the unit the formula reads, always — never in the one that was typed.
     *
     * The alternative is storing a value and a unit together and converting on every read, which
     * means every future reader has to remember to. One conversion, at the edge, is the same
     * argument `metricFormat` makes about display: decide once, at the boundary.
     */
    const value = isLevineKey(marker.key)
      ? toTargetUnit(marker.key, Number(text), unit)
      : extraToTargetUnit(marker.key, Number(text), unit);
    if (value !== null) stored[marker.key] = value;
  }

  return { approvedAt, markers: stored, readBy: source, unitsAsEntered: units };
}

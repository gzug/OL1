/**
 * What can be worked out from a lipid panel without modelling anybody.
 *
 * **The line this file draws: compute what is ARITHMETIC, refuse what is a PROXY.**
 *
 * The owner asked for two derived metrics on 2026-08-20 — cholesterol balance and insulin
 * resistance. One of them is subtraction. The other is a population model wearing a division sign,
 * and `docs/decisions/0018` records why it is not here.
 *
 * Nothing below has a fitted coefficient, a reference cohort or a threshold in it. That is what
 * separates these from PhenoAge, which is a regression and needs its whole apparatus of refusals —
 * a range instead of a point, a floor on CRP, a driver list carrying no numbers. Subtraction needs
 * none of that, and pretending it does would be its own kind of dishonesty.
 *
 * **No verdicts and no ranges.** A laboratory prints its own reference ranges beside these on the
 * report; what this adds is the number, not an opinion of it.
 */

export type LipidReading = {
  /** What it is, in one sentence, with no judgement in it. */
  readonly what: string;
  readonly key: 'non_hdl' | 'tc_hdl_ratio';
  readonly label: string;
  readonly unit: string;
  readonly value: number;
};

type Markers = Readonly<Record<string, unknown>>;

function usable(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * The readings a panel supports, or an empty list.
 *
 * Each needs exactly the markers it names and nothing else. A panel with total cholesterol and no
 * HDL produces neither, rather than one of them from a substituted value — the same refusal every
 * calculation in this folder makes.
 */
export function lipidReadings(markers: Markers): readonly LipidReading[] {
  const total = markers.total_cholesterol;
  const hdl = markers.hdl;
  if (!usable(total) || !usable(hdl)) return [];

  /**
   * **Total minus HDL.** Subtraction, and nothing else — no cohort, no coefficient, no cutoff.
   *
   * It is worth showing because a report usually prints total and HDL and leaves this to be done in
   * somebody's head, and because it moves when LDL alone does not: it counts what is carried by
   * everything that is not an HDL particle, which is more than LDL is.
   */
  const readings: LipidReading[] = [
    {
      key: 'non_hdl',
      label: 'Non-HDL cholesterol',
      unit: 'mg/dL',
      value: Math.round((total - hdl) * 10) / 10,
      what: 'Total cholesterol with HDL taken out — everything else your panel counted.',
    },
  ];

  /**
   * **The ratio a laboratory usually prints itself.** One division, and the reason it is here is
   * that a person reading two numbers cannot see the relationship between them without doing it.
   *
   * Deliberately NOT the triglyceride-to-HDL ratio, which looks identical and is not — see
   * `docs/decisions/0018`.
   */
  readings.push({
    key: 'tc_hdl_ratio',
    label: 'Total to HDL',
    unit: '',
    value: Math.round((total / hdl) * 100) / 100,
    what: 'How much total cholesterol there is for each unit of HDL. A plain ratio of the two above.',
  });

  return readings;
}

/** The sentence that has to accompany these, because arithmetic on one draw is still one draw. */
export const LIPID_READING_CAVEAT =
  'Worked out from the panel above and nothing else. No reference range is applied here — your ' +
  'report carries its own, and what these add is the number rather than an opinion of it.';

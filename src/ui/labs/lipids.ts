/**
 * The markers a panel can hold that the age calculation does not read.
 *
 * **The nine Levine markers are not the nine most interesting numbers in blood.** They are the nine
 * one published formula takes, which `markerContext.ts` already says out loud on every marker's
 * `why` line. A person tracking their own health measures more than that, and until now OL1 could
 * not record any of it — a panel arrived with a lipid profile on it and the app read past it.
 *
 * The owner's own records track ApoB, Lp(a), LDL, HDL and triglycerides. These are the ones worth
 * having first, plus the two that come on the same page.
 *
 * **They are recorded and shown. They do not feed the biological age, and nothing here may imply
 * they do.** That boundary is the whole reason this list is separate from `LEVINE_MARKERS` rather
 * than appended to it: a screen that mixed them would suggest a fuller panel produces a more certain
 * number, and it does not — `computePhenoAgeRange` reads exactly nine keys and would ignore these.
 *
 * No reference ranges here either, for the reason `YourMarkers` gives: a value shown beside a range
 * is read as inside or outside it, which is a judgement this app does not make and one the
 * laboratory already printed on the report.
 */

export type ExtraMarkerKey =
  | 'apob'
  | 'hba1c'
  | 'hdl'
  | 'ldl'
  | 'lpa'
  | 'total_cholesterol'
  | 'triglycerides'
  | 'vitamin_d';

export type ExtraMarker = {
  readonly key: ExtraMarkerKey;
  readonly label: string;
  /** Outside this a number is a misread unit or a typo. Not a reference range, and never shown. */
  readonly sane: { readonly max: number; readonly min: number };
  /** The unit this is stored in. The alternate a laboratory might print is in `units.ts`. */
  readonly unit: string;
  /** What it is, in plain language. Same four rules as `markerContext`: no diagnosis, no advice. */
  readonly what: string;
  /**
   * Why it is on the panel at all.
   *
   * **The nine have a `why` that says they are read by a formula.** These have a different one, and
   * it has to be different or the screen implies they feed the biological age: they are here
   * because a person chose to measure them. That is the whole answer, and it is an honest one.
   */
  readonly why: string;
  /** What it is usually read next to. Never a rule about what to do. */
  readonly alongside: string;
};

/**
 * Ordered the way a lipid panel is printed, then the two that are not lipids.
 *
 * `sane` bounds are wide on purpose — they catch a decimal in the wrong place or a unit read as the
 * other one, and say nothing whatever about whether a value is healthy.
 */
export const EXTRA_MARKERS: readonly ExtraMarker[] = [
  {
    alongside: 'LDL, HDL and triglycerides, which are the parts it adds up.',
    key: 'total_cholesterol',
    label: 'Total Cholesterol',
    sane: { max: 800, min: 20 },
    unit: 'mg/dL',
    what: 'All the cholesterol carried in the blood, added together.',
    why: 'Nothing calculates with it here — it is on your report and you chose to track it.',
  },
  {
    alongside: 'HDL and triglycerides, and ApoB where a panel carries one.',
    key: 'ldl',
    label: 'LDL Cholesterol',
    sane: { max: 600, min: 5 },
    unit: 'mg/dL',
    what: 'Cholesterol carried by low-density particles. Usually calculated rather than measured directly.',
    why: 'Recorded because you measure it. The biological age does not read it.',
  },
  {
    alongside: 'LDL and triglycerides on the same panel.',
    key: 'hdl',
    label: 'HDL Cholesterol',
    sane: { max: 200, min: 5 },
    unit: 'mg/dL',
    what: 'Cholesterol carried by high-density particles.',
    why: 'Recorded because you measure it. The biological age does not read it.',
  },
  {
    alongside: 'Glucose, and how long before the draw somebody last ate.',
    key: 'triglycerides',
    label: 'Triglycerides',
    sane: { max: 2000, min: 10 },
    unit: 'mg/dL',
    what: 'Fat carried in the blood. It rises after eating, which is why panels ask for a fast.',
    why: 'Recorded because you measure it. The biological age does not read it.',
  },
  {
    alongside: 'LDL, which counts cholesterol rather than particles.',
    key: 'apob',
    label: 'Apolipoprotein B',
    sane: { max: 400, min: 10 },
    unit: 'mg/dL',
    what: 'One molecule sits on each particle that carries cholesterol, so this counts the particles rather than the cholesterol in them.',
    why: 'Kept because you track it. Nothing in this app calculates with it yet.',
  },
  {
    alongside: 'The rest of the lipid panel, though it moves independently of them.',
    key: 'lpa',
    label: 'Lipoprotein(a)',
    sane: { max: 500, min: 0.1 },
    unit: 'nmol/L',
    what: 'A particle type that is largely set by inheritance and changes very little over a life.',
    why: 'Kept because you track it. It is usually measured once rather than followed.',
  },
  {
    alongside: 'Glucose, which is this morning rather than the last three months.',
    key: 'hba1c',
    label: 'HbA1c',
    sane: { max: 20, min: 2 },
    unit: '%',
    what: 'The share of haemoglobin with glucose attached. It reflects roughly the last three months rather than this morning.',
    why: 'Kept because you track it. The biological age reads a single glucose instead.',
  },
  {
    alongside: 'Calcium, and the time of year the blood was drawn.',
    key: 'vitamin_d',
    label: 'Vitamin D',
    sane: { max: 400, min: 1 },
    unit: 'ng/mL',
    what: '25-hydroxyvitamin D, the form measured to describe how much of it the body is holding.',
    why: 'Kept because you track it. Nothing in this app calculates with it.',
  },
];

export function extraMarker(key: string): ExtraMarker | undefined {
  return EXTRA_MARKERS.find((marker) => marker.key === key);
}

/**
 * **Nothing in `EXTRA_MARKERS` may share a key with the nine.**
 *
 * They are stored in one `markers` object on the panel payload, so a collision would silently feed
 * a lipid value into the age calculation — the one thing this separation exists to prevent. Held by
 * a test rather than by care.
 */
export const EXTRA_MARKER_KEYS: readonly string[] = EXTRA_MARKERS.map((marker) => marker.key);

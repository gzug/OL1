/**
 * How old the last blood panel is.
 *
 * **PORTED from Legacy `data/home/panelRecency.ts`**, thresholds and all: fresh under six months,
 * ageing to twelve, stale past that. Legacy's own note on it — *"a calm, honest nudge"* — is the
 * whole brief, and its exported constants are the single source of truth so a test can build an
 * offset with the same divisor the helper uses and land exactly on a boundary.
 *
 * **Phrased as information, never as instruction.** Legacy's sibling `homeBioAgeTiming.ts` says it
 * out loud: these are "general retest cadences only... not medical advice and not a treatment
 * recommendation". A panel going stale is a fact about a date. Whether to get another one is a
 * conversation with a doctor, and nothing here is entitled to open it with "you should".
 *
 * What changed in the port: Legacy read its own `BloodPanel` rows and preferred an ISO `drawnAt`
 * over list order. Ours are `hub_entry` rows on the `labs` hub, where `recordedAt` IS the draw date
 * — `LabUploadFlow` sets it from the panel's test date rather than from when it was typed, which is
 * exactly the distinction Legacy's fallback existed to paper over.
 */

/** Panels younger than this are fresh. Legacy's number. */
export const FRESH_MONTHS = 6;

/** Past this a panel is stale. Legacy's number. */
export const STALE_MONTHS = 12;

/** 365.25 / 12. Exported so a test can build an offset with the same divisor and hit a boundary. */
export const DAYS_PER_MONTH = 365.25 / 12;

export type PanelRecencyStatus = 'ageing' | 'fresh' | 'none' | 'stale';

export type PanelRecency = {
  /** Whole months since it was drawn. Null when there is no panel or no usable date. */
  readonly monthsAgo: number | null;
  readonly status: PanelRecencyStatus;
};

export type PanelEntry = {
  readonly kind: string;
  readonly recordedAt: string;
};

export function panelRecency(entries: readonly PanelEntry[], now: string): PanelRecency {
  const panels = entries
    .filter((entry) => entry.kind === 'panel')
    .map((entry) => Date.parse(entry.recordedAt))
    .filter((ms) => Number.isFinite(ms));

  if (panels.length === 0) return { monthsAgo: null, status: 'none' };

  const latest = Math.max(...panels);
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) return { monthsAgo: null, status: 'none' };

  /**
   * A panel dated in the future is not a fresh panel — it is a wrong date, and treating it as
   * fresh would silence the nudge for as long as the mistake stood. Floored at zero rather than
   * hidden, so the screen still says a panel exists.
   */
  const days = Math.max(0, (nowMs - latest) / 86_400_000);
  const monthsAgo = Math.floor(days / DAYS_PER_MONTH);

  if (monthsAgo < FRESH_MONTHS) return { monthsAgo, status: 'fresh' };
  if (monthsAgo < STALE_MONTHS) return { monthsAgo, status: 'ageing' };
  return { monthsAgo, status: 'stale' };
}

/**
 * What the screen says about it.
 *
 * Every one of these is a statement about a date. None of them tells anybody to do anything — see
 * the note at the top of this file for why that line is drawn where it is.
 */
export function recencySentence(recency: PanelRecency): string {
  const months = recency.monthsAgo ?? 0;
  const ago = months === 0 ? 'this month' : months === 1 ? '1 month ago' : `${months} months ago`;

  switch (recency.status) {
    case 'none':
      return 'No panel yet. The age calculation has nothing to read until there is one.';
    case 'fresh':
      return `Drawn ${ago}.`;
    case 'ageing':
      return `Drawn ${ago}. Most markers here are usually looked at once or twice a year.`;
    case 'stale':
      return `Drawn ${ago}. Anything this panel says is a year or more out of date.`;
  }
}

/**
 * Whether a second panel would turn the reading into a direction.
 *
 * One panel is a point. The Twin already says so in its fixture — "a second panel is what turns
 * this from a reading into a direction" — and this is the same sentence with a number behind it.
 */
export function panelCount(entries: readonly PanelEntry[]): number {
  return entries.filter((entry) => entry.kind === 'panel').length;
}

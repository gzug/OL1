/**
 * Training consistency as a grid: seven rows of days, one column per week.
 *
 * **PORTED from Legacy `data/activity/activityHeatmap.ts`**, which is the cheapest good thing in
 * that repository — pure `YYYY-MM-DD` string date maths at UTC noon, no timezone library, no Intl,
 * no database. Every square is provable without a device, which is why it survives the port intact.
 *
 * Two things came with it because they are decisions rather than code:
 *
 * - **The anchor rule.** The grid's right edge is today when the data is recent, and the last day
 *   with data when it is not. Legacy learned this the hard way: anchoring always to today makes a
 *   stale dataset render an ever-emptier grid, and anchoring always to the data makes someone who
 *   trained yesterday see a grid that ends last month. Fresh data anchors to today; anything more
 *   than four weeks cold anchors to itself.
 * - **Buckets are relative to the busiest day**, not to a target. Same argument as the body figure
 *   and the week strip: there is no target here, and inventing one to divide by would be inventing
 *   the reading.
 *
 * What did NOT come across is Legacy's coupling to `StravaDemoActivity`. That type belongs to the
 * demo export this project refused (`docs/legacy-inventory.md` §5), and the map-based entry point
 * was already the better half of Legacy's own API.
 */

export const MS_PER_DAY = 86_400_000;

export type HeatmapCell = {
  /** How busy, 0 to 4. Relative to the busiest day in the window. */
  readonly bucket: number;
  readonly key: string;
  /** `YYYY-MM-DD`, or null in the grid drawn when there is nothing at all. */
  readonly localDate: string | null;
  readonly minutes: number;
};

export type Heatmap = {
  readonly hasData: boolean;
  readonly rows: readonly (readonly HeatmapCell[])[];
};

/** UTC noon, so a day is a day whatever the device thinks about clocks. Legacy's trick. */
export function parseLocalDate(localDate: string): Date | null {
  if (typeof localDate !== 'string' || localDate.length < 10) return null;

  const year = Number(localDate.slice(0, 4));
  const month = Number(localDate.slice(5, 7));
  const day = Number(localDate.slice(8, 10));

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const ms = Date.UTC(year, month - 1, day, 12, 0, 0, 0);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/** Monday is row 0. A training week starts on Monday whatever the calendar app says. */
export function mondayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function isoOf(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** How far the data may be behind today before the grid anchors to the data instead. */
export const STALE_AFTER_DAYS = 28;

export function buildHeatmap(
  minutesByDate: ReadonlyMap<string, number>,
  weeks: number,
  today: string,
): Heatmap {
  const columns = Math.max(1, Math.floor(weeks));

  const empty: HeatmapCell[][] = Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: columns }, (_, column) => ({
      bucket: 0,
      key: `r${row}c${column}`,
      localDate: null,
      minutes: 0,
    })),
  );

  let latest = Number.NEGATIVE_INFINITY;
  for (const date of minutesByDate.keys()) {
    const parsed = parseLocalDate(date);
    if (parsed !== null) latest = Math.max(latest, parsed.getTime());
  }

  if (!Number.isFinite(latest)) return { hasData: false, rows: empty };

  // The anchor rule, and the reason it exists is in this file's header.
  const anchorDate = parseLocalDate(today);
  const anchor =
    anchorDate !== null && latest >= anchorDate.getTime() - STALE_AFTER_DAYS * MS_PER_DAY
      ? anchorDate.getTime()
      : latest;

  const lastMonday = anchor - mondayIndex(new Date(anchor)) * MS_PER_DAY;
  const firstMonday = lastMonday - (columns - 1) * 7 * MS_PER_DAY;

  const peak = Math.max(...minutesByDate.values(), 0);
  const bucketFor = (minutes: number): number => {
    if (minutes <= 0 || peak <= 0) return 0;
    const ratio = minutes / peak;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  const rows: HeatmapCell[][] = Array.from({ length: 7 }, () => []);
  for (let column = 0; column < columns; column += 1) {
    const monday = firstMonday + column * 7 * MS_PER_DAY;
    for (let row = 0; row < 7; row += 1) {
      const iso = isoOf(new Date(monday + row * MS_PER_DAY));
      const minutes = minutesByDate.get(iso) ?? 0;
      rows[row]?.push({ bucket: bucketFor(minutes), key: `r${row}c${column}`, localDate: iso, minutes });
    }
  }

  return { hasData: true, rows };
}

/** Legacy's own opacity ramp, kept so a bucket looks the same as it did there. */
export function bucketOpacity(bucket: number): number {
  switch (bucket) {
    case 1:
      return 0.28;
    case 2:
      return 0.52;
    case 3:
      return 0.76;
    case 4:
      return 1;
    default:
      return 0;
  }
}

/**
 * Minutes per day, from stored session entries.
 *
 * A session with no minutes contributes a day but no time — it happened, and how long is unknown.
 * Counting it as zero would be the same lie a zero macro would be.
 */
export function minutesByDate(
  entries: readonly { kind: string; payload: Readonly<Record<string, unknown>>; recordedAt: string }[],
): Map<string, number> {
  const map = new Map<string, number>();

  for (const entry of entries) {
    if (entry.kind !== 'session') continue;
    const day = entry.recordedAt.slice(0, 10);
    const minutes = entry.payload.minutes;
    map.set(day, (map.get(day) ?? 0) + (typeof minutes === 'number' && minutes > 0 ? minutes : 0));
  }

  return map;
}

/** "12 sessions, 84 km" — the one line under the grid. Empty when there is nothing to summarise. */
export function lifetimeLine(
  entries: readonly { kind: string; payload: Readonly<Record<string, unknown>> }[],
): string {
  const sessions = entries.filter((entry) => entry.kind === 'session');
  if (sessions.length === 0) return '';

  const km = sessions.reduce((total, entry) => {
    const distance = entry.payload.distanceKm;
    return total + (typeof distance === 'number' && Number.isFinite(distance) ? distance : 0);
  }, 0);

  const noun = sessions.length === 1 ? 'session' : 'sessions';
  const rounded = Math.round(km);
  const withCommas = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return rounded === 0 ? `${sessions.length} ${noun}` : `${sessions.length} ${noun}, ${withCommas} km`;
}

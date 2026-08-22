import type { HubEntry } from '@/core/hubs';
import type { CockpitPeriod } from '@/ui/hubs/hubState';
import { STATUSES, type RecordKind } from '@/ui/medical/record';

/**
 * Your Health record, read back to you.
 *
 * **It lists them.** Every other cockpit in this app summarises — counts, averages, the longest and
 * the shortest — because a week of meals is not worth reading item by item. A health record is the
 * opposite: three conditions and two medications is the whole thing, and a block reporting "3
 * conditions recorded" without naming them would be a summary of something nobody can see.
 *
 * **Nothing here is checked against anything.** No interaction is looked for between two
 * medications, no dose is judged, no condition is classified. `docs/decisions/0019` and the caption
 * on the screen both say so — an unexamined assumption that a health app does that is exactly the
 * assumption this hub would otherwise invite.
 */

type Record_ = {
  readonly detail: string | null;
  readonly kind: RecordKind;
  readonly name: string;
  readonly status: string;
};

function statusLabel(kind: RecordKind, status: unknown): string | null {
  return STATUSES[kind].find((option) => option.id === status)?.label ?? null;
}

function recordOf(entry: HubEntry): Record_ | null {
  if (entry.kind !== 'condition' && entry.kind !== 'medication') return null;

  const name = entry.payload.name;
  if (typeof name !== 'string' || name.trim().length === 0) return null;

  const label = statusLabel(entry.kind, entry.payload.status);
  if (label === null) return null;

  const detail = entry.payload.detail;
  return {
    detail: typeof detail === 'string' && detail.trim().length > 0 ? detail.trim() : null,
    kind: entry.kind,
    name: name.trim(),
    status: label,
  };
}

/**
 * Current before past, and alphabetical inside each.
 *
 * Not newest first, which is what every other block here does: a health record is read for what is
 * true NOW, and something recorded years ago is no less current for being old. Recording order is
 * an accident of when somebody remembered.
 */
function ordered(records: readonly Record_[]): readonly Record_[] {
  const live = new Set(['Current', 'Ongoing']);
  return [...records].sort((a, b) => {
    const byStatus = Number(live.has(b.status)) - Number(live.has(a.status));
    return byStatus !== 0 ? byStatus : a.name.localeCompare(b.name);
  });
}

const HEADING: Readonly<Record<RecordKind, string>> = {
  condition: 'Conditions',
  medication: 'Medications',
};

const NO_DETAIL: Readonly<Record<RecordKind, string>> = {
  condition: 'no date given',
  medication: 'no dose recorded',
};

export function medicalPeriods(entries: readonly HubEntry[]): readonly CockpitPeriod[] {
  const records = entries.map(recordOf).filter((record): record is Record_ => record !== null);

  return (['condition', 'medication'] as const)
    .map((kind) => {
      const mine = ordered(records.filter((record) => record.kind === kind));
      if (mine.length === 0) return null;

      return {
        label: HEADING[kind],
        rows: mine.map((record) => ({
          label: record.name,
          value: record.status,
          when: record.detail ?? NO_DETAIL[kind],
        })),
      };
    })
    .filter((period): period is CockpitPeriod => period !== null);
}

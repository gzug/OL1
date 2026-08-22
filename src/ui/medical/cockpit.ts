import type { HubEntry } from '@/core/hubs';
import { day } from '@/ui/hubs/entryWords';
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

/** A sentence somebody wrote about their own health, and the day it was written down. */
export type RecordNote = {
  readonly day: string;
  readonly text: string;
};

/**
 * The free text on this hub, which had no screen at all until 2026-08-22.
 *
 * **The first run asks "anything you live with" and files the answer here**, verbatim —
 * `FirstRunFlow.commitRecords`, whose own comment says *"What somebody typed about their own health
 * is the one thing here that must come back out exactly as it went in."* It went in and it did not
 * come back out: `medicalPeriods` reads conditions and medications, `StoredEntries` prints a date
 * and a provenance, and **nothing in `src/ui/` rendered `payload.text`.** Somebody who typed a
 * sentence in the first run opened Health record and found "2 notes" and two dates.
 *
 * Worse, `medicalPeriods` returns nothing without a condition or a medication, so a hub holding
 * only notes rendered no cockpit whatsoever. `docs/decisions/0019` argues that this hub LISTS
 * rather than summarises, because a health record is nothing but its items — and a note is an item.
 *
 * Found because a coach could read these before any screen could. `docs/decisions/0020` named it as
 * the one thing a coach knew that no screen showed; this is the other half of that.
 *
 * **No authorship is claimed, deliberately.** The flow writes two kinds of note here and nothing
 * tells them apart: what a person typed, and the line it adds itself for a microbiome or genetic
 * result it cannot read. A heading reading "in your own words" would put ours in their mouth on the
 * one screen where that matters most, so the heading says what is true of both.
 *
 * Newest first, unlike the conditions above it. A condition is a standing fact and is read for what
 * is true now; a note is something that was written on a day, which is how `StoredEntries` treats
 * every entry it lists.
 */
export function recordNotes(entries: readonly HubEntry[]): readonly RecordNote[] {
  return (
    entries
      .filter((entry) => entry.kind === 'note')
      /* Sorted on `recordedAt` and formatted afterwards. `day` produces "13 Jul", and comparing
         those as strings puts August before December and 13 before 2 — a date that has been made
         readable has stopped being sortable. */
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .map((entry) => ({
        day: day(entry.recordedAt),
        text: typeof entry.payload.text === 'string' ? entry.payload.text.trim() : '',
      }))
      .filter((note) => note.text.length > 0)
  );
}

export function medicalPeriods(entries: readonly HubEntry[]): readonly CockpitPeriod[] {
  const records = entries.map(recordOf).filter((record): record is Record_ => record !== null);

  return (['condition', 'medication'] as const)
    /* Annotated, because the inferred literal has a MUTABLE `rows` and `CockpitPeriod` wants a
       readonly one — so the narrowing predicate below has nothing valid to narrow to. */
    .map((kind): CockpitPeriod | null => {
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

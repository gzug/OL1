/**
 * Decides whether a range of commits removed enough that the next person will want a note.
 *
 * Pure on purpose: the git reading lives in check-change-rationale.ts, so this half can be fed a
 * known violation from a test instead of a scratch repository.
 *
 * One trigger only, deliberately. An earlier draft also fired on any deleted line in the files
 * that state rules — which would have meant asking for a decision record over a fixed typo. A
 * guard that goes red without cause gets routed around, and a routed-around guard is how the
 * predecessor ended up with prose describing a pre-push hook nobody ever committed. Widen this
 * later if something real slips through, not before.
 */

export type FileChange = {
  additions: number;
  deletions: number;
  path: string;
};

export type CommitChange = {
  files: FileChange[];
  sha: string;
  subject: string;
};

export type Finding = {
  deletions: number;
  path: string;
  sha: string;
  subject: string;
};

export type Verdict = {
  decisionFiles: string[];
  findings: Finding[];
  ok: boolean;
};

/**
 * A deletion this large in one file is a rewrite, not an edit. The number is a guess — see
 * docs/decisions/0001-agent-workspace.md. Raising it is routine; do it in a visible diff.
 */
export const LARGE_DELETION_LINES = 200;

export const DECISION_FILE_PATTERN = /^docs\/decisions\/\d{4}-[a-z0-9-]+\.md$/;

const IGNORED_PATHS = [/^package-lock\.json$/, /^dist\//];

function isIgnored(path: string): boolean {
  return IGNORED_PATHS.some((pattern) => pattern.test(path));
}

export function findings(commits: CommitChange[]): Finding[] {
  const result: Finding[] = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (isIgnored(file.path) || file.deletions <= LARGE_DELETION_LINES) continue;

      result.push({
        deletions: file.deletions,
        path: file.path,
        sha: commit.sha,
        subject: commit.subject,
      });
    }
  }

  return result;
}

export function evaluate(commits: CommitChange[], addedPaths: string[]): Verdict {
  const decisionFiles = addedPaths.filter((path) => DECISION_FILE_PATTERN.test(path));
  const found = findings(commits);

  return {
    decisionFiles,
    findings: found,
    ok: found.length === 0 || decisionFiles.length > 0,
  };
}

/**
 * Numbers used by more than one note.
 *
 * **Two sessions each took `0015` on consecutive days**, neither aware of the other, because the
 * number is a manual counter and `nextDecisionNumber` only ever looks at what is already on disk —
 * which does not include the note being written in the other worktree right now.
 *
 * The collision is cheap to fix and expensive to notice: a decision note is the project's memory,
 * and `docs/decisions/0015` stops meaning anything the moment it means two documents. Code comments
 * in three files were already pointing at an ambiguous number.
 *
 * A duplicate is far more likely than a gap, and a gap is harmless — so this checks for the
 * duplicate and says nothing about gaps.
 */
export function duplicateDecisionNumbers(existingPaths: string[]): string[] {
  const seen = new Map<string, number>();

  for (const path of existingPaths) {
    const number = /(\d{4})-/.exec(path)?.[1];
    if (number === undefined) continue;
    seen.set(number, (seen.get(number) ?? 0) + 1);
  }

  return [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([number]) => number)
    .sort();
}

/** Suggests the next free number so the failure message can hand over a real filename. */
export function nextDecisionNumber(existingPaths: string[]): string {
  const numbers = existingPaths
    .map((path) => /(\d{4})-/.exec(path)?.[1])
    .filter((value): value is string => value !== undefined)
    .map(Number);

  return String(Math.max(0, ...numbers) + 1).padStart(4, '0');
}

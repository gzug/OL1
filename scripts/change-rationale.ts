/**
 * Decides whether a range of commits removed something that needs a recorded reason.
 *
 * Pure on purpose: the git reading lives in check-change-rationale.ts, so this half can be
 * fed a known violation from a test instead of a scratch repository.
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
  path: string;
  reason: string;
  sha: string;
  subject: string;
};

export type Verdict = {
  decisionFiles: string[];
  findings: Finding[];
  ok: boolean;
};

/** Deleting a line from one of these removes a stated rule or a stated product decision. */
export const GUARDED_PATHS = [
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
  'docs/product-spec.md',
];

/**
 * A deletion this large in a single file is a rewrite, not an edit. The number is a guess;
 * see docs/decisions/0001-agent-workspace.md. Tuning it is expected, not a defeat.
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
      if (isIgnored(file.path) || file.deletions === 0) continue;

      if (GUARDED_PATHS.includes(file.path)) {
        result.push({
          path: file.path,
          reason: `removes ${file.deletions} line(s) from a file that states rules`,
          sha: commit.sha,
          subject: commit.subject,
        });
        continue;
      }

      if (file.deletions > LARGE_DELETION_LINES) {
        result.push({
          path: file.path,
          reason: `removes ${file.deletions} lines in one commit`,
          sha: commit.sha,
          subject: commit.subject,
        });
      }
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

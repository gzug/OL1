/**
 * Asks for a short note when a change removes a lot.
 *
 * Walks the range COMMIT BY COMMIT. The cumulative diff of a branch hides deletions that were
 * later re-added or shrunk: gzug/ol1's own codex/concept-lab-preview branch reads +107/-0 as a
 * whole, while commit 13625ef inside it deleted 594 lines including an experiment stop condition
 * and the only refusal-to-act rule. A per-pull-request check would have shipped that.
 *
 * Usage: tsx scripts/check-change-rationale.ts <base-ref> <head-ref>
 */

import { execFileSync } from 'node:child_process';

import {
  duplicateDecisionNumbers,
  evaluate,
  nextDecisionNumber,
  type CommitChange,
  type FileChange,
} from './change-rationale';

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

/** `-M` reports a rename as "old => new"; only the destination path matters here. */
function normalizePath(raw: string): string {
  const arrow = raw.lastIndexOf(' => ');
  return arrow === -1 ? raw : raw.slice(arrow + 4).replace(/[{}]/g, '');
}

function parseNumstat(output: string): FileChange[] {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [additions, deletions, ...rest] = line.split('\t');
      return {
        // A binary file reports "-" for both counts.
        additions: Number.parseInt(additions, 10) || 0,
        deletions: Number.parseInt(deletions, 10) || 0,
        path: normalizePath(rest.join('\t')),
      };
    });
}

function readCommits(base: string, head: string): CommitChange[] {
  const shas = git(['rev-list', '--no-merges', '--reverse', `${base}..${head}`])
    .split('\n')
    .filter(Boolean);

  return shas.map((sha) => ({
    files: parseNumstat(git(['diff', '-M', '--numstat', `${sha}^`, sha])),
    sha: sha.slice(0, 7),
    subject: git(['log', '-1', '--format=%s', sha]),
  }));
}

function main(): void {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) {
    console.error('Usage: tsx scripts/check-change-rationale.ts <base-ref> <head-ref>');
    process.exit(2);
  }

  const addedPaths = git(['diff', '--name-only', '--diff-filter=A', base, head])
    .split('\n')
    .filter(Boolean);

  /**
   * **Checked on every pull request, not only on one that removes a lot.**
   *
   * A duplicate number arrives with a note somebody ADDED, and adding needs no rationale — so
   * hanging this off the deletion path would have watched the collision that prompted it go past.
   */
  const clash = duplicateDecisionNumbers(git(['ls-files', 'docs/decisions']).split('\n'));
  if (clash.length > 0) {
    console.error(`Two decision notes share a number: ${clash.join(', ')}.\n`);
    console.error(
      `A note is the project's memory, and "docs/decisions/${clash[0]}" stops meaning anything the
moment it means two documents. It happens because the number is a manual counter and two sessions
each take the next free one without seeing the other's worktree.

Rename the newer file to the next free number, ${nextDecisionNumber(git(['ls-files', 'docs/decisions']).split('\n'))},
and follow its references — a decision number is quoted in code comments, not only in the folder.`,
    );
    process.exit(1);
  }

  const verdict = evaluate(readCommits(base, head), addedPaths);

  if (verdict.ok) {
    console.log(
      verdict.findings.length === 0
        ? 'Change rationale: nothing large was removed'
        : `Change rationale: explained by ${verdict.decisionFiles.join(', ')}`,
    );
    return;
  }

  const number = nextDecisionNumber(git(['ls-files', 'docs/decisions']).split('\n'));

  console.error('This change removes a lot. Worth a sentence for whoever reads it next.\n');
  for (const finding of verdict.findings) {
    console.error(
      `  ${finding.path} — ${finding.deletions} lines gone in ${finding.sha} "${finding.subject}"`,
    );
  }
  console.error(`
Not a rule you broke — a note nobody can reconstruct later. Two minutes:

  cp docs/decisions/TEMPLATE.md docs/decisions/${number}-short-slug.md

Fill in what you removed and why the previous answer stopped being right, then commit it
alongside this change. Format and examples: docs/decisions/README.md

If this fired on something harmless, that is a bug in the guard — raise the threshold in
scripts/change-rationale.ts and say so in a decision note. Do not add a way around it.`);
  process.exit(1);
}

main();

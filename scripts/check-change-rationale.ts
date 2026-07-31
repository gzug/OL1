/**
 * Fails a pull request that removes something without recording why.
 *
 * Walks the range COMMIT BY COMMIT. The cumulative diff of a branch hides deletions that were
 * later re-added or shrunk: gzug/ol1's own codex/concept-lab-preview branch reads +107/-0 as a
 * whole, while commit 13625ef inside it deleted 594 lines including an experiment stop condition
 * and the only refusal-to-act rule. A per-pull-request check would have shipped that.
 *
 * Usage: tsx scripts/check-change-rationale.ts <base-ref> <head-ref>
 */

import { execFileSync } from 'node:child_process';

import { evaluate, type CommitChange, type FileChange } from './change-rationale';

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

  const verdict = evaluate(readCommits(base, head), addedPaths);

  if (verdict.ok) {
    console.log(
      verdict.findings.length === 0
        ? 'Change rationale: nothing removed that needs a recorded reason'
        : `Change rationale: ${verdict.findings.length} removal(s), explained by ${verdict.decisionFiles.join(', ')}`,
    );
    return;
  }

  console.error('This change removes things without recording why:\n');
  for (const finding of verdict.findings) {
    console.error(`  ${finding.sha} ${finding.subject}`);
    console.error(`    ${finding.path} — ${finding.reason}\n`);
  }
  console.error(
    'Add docs/decisions/NNNN-<slug>.md in this pull request saying why the previous answer',
    '\nstopped being right. See docs/decisions/README.md. There is no skip flag.',
  );
  process.exit(1);
}

main();

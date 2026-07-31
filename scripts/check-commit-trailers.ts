/**
 * Fails a pull request whose commits do not say which agent produced them.
 *
 * Usage: tsx scripts/check-commit-trailers.ts <base-ref> <head-ref>
 */

import { execFileSync } from 'node:child_process';

import { KNOWN_AGENTS, evaluate, type CommitMessage } from './commit-trailers';

const FIELD = '\u001f';
const RECORD = '\u001e';

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function readCommits(base: string, head: string): CommitMessage[] {
  // Merge commits are exempt: merging main into a branch produces a commit nobody authored.
  const raw = git([
    'log',
    '--no-merges',
    '--reverse',
    `--format=%h${FIELD}%s${FIELD}%b${RECORD}`,
    `${base}..${head}`,
  ]);

  return raw
    .split(RECORD)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha, subject, body] = entry.split(FIELD);
      return { body: body ?? '', sha, subject: subject ?? '' };
    });
}

function main(): void {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) {
    console.error('Usage: tsx scripts/check-commit-trailers.ts <base-ref> <head-ref>');
    process.exit(2);
  }

  const commits = readCommits(base, head);
  const verdict = evaluate(commits);

  if (verdict.ok) {
    console.log(`Commit trailers: ${commits.length} commit(s), all attributed`);
    return;
  }

  console.error('These commits do not say who produced them:\n');
  for (const commit of verdict.missing) {
    console.error(`  ${commit.sha} ${commit.subject}`);
  }
  console.error(
    `\nEvery commit needs an "Agent:" trailer (${KNOWN_AGENTS.join(', ')}).`,
    '\nThe author field does not survive a squash merge; a trailer does.',
    '\n\n  last commit:  git commit --amend --trailer "Agent: claude-code"',
    `\n  whole branch: git rebase ${base} --exec 'git commit --amend --no-edit --trailer "Agent: claude-code"'`,
  );
  process.exit(1);
}

main();

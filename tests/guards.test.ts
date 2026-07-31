import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { LARGE_DELETION_LINES, evaluate as evaluateRationale } from '../scripts/change-rationale';
import { evaluate as evaluateTrailers } from '../scripts/commit-trailers';

/**
 * An empty baseline has the same shape as a blind gate. Before believing a guard, feed it a known
 * violation and watch it go red. These tests are that step, made permanent instead of manual.
 */

/** The real incident: commit 13625ef on codex/concept-lab-preview, +69/-594, message "simplify". */
const CONCEPT_LAB_DELETION = {
  files: [{ additions: 69, deletions: 594, path: 'public/concept-lab.html' }],
  sha: '13625ef',
  subject: 'refactor: simplify concept lab experience',
};

test('a large deletion with no decision entry is refused', () => {
  const verdict = evaluateRationale([CONCEPT_LAB_DELETION], []);

  assert.equal(verdict.ok, false);
  assert.equal(verdict.findings.length, 1);
  assert.equal(verdict.findings[0].path, 'public/concept-lab.html');
});

test('the same deletion passes once a decision entry explains it', () => {
  const verdict = evaluateRationale(
    [CONCEPT_LAB_DELETION],
    ['docs/decisions/0002-drop-the-concept-lab.md'],
  );

  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.decisionFiles, ['docs/decisions/0002-drop-the-concept-lab.md']);
});

test('removing even one line from a file that states rules is refused', () => {
  const verdict = evaluateRationale(
    [
      {
        files: [{ additions: 0, deletions: 1, path: 'AGENTS.md' }],
        sha: 'abc1234',
        subject: 'chore: tidy',
      },
    ],
    [],
  );

  assert.equal(verdict.ok, false);
});

test('ordinary work and lockfile churn are not refused', () => {
  const verdict = evaluateRationale(
    [
      {
        files: [
          { additions: 40, deletions: 12, path: 'src/app/index.tsx' },
          { additions: 900, deletions: 900, path: 'package-lock.json' },
        ],
        sha: 'def5678',
        subject: 'feat: add a screen',
      },
    ],
    [],
  );

  assert.equal(verdict.ok, true);
});

test('the deletion threshold is a boundary, not an approximation', () => {
  const atLimit = evaluateRationale(
    [
      {
        files: [{ additions: 0, deletions: LARGE_DELETION_LINES, path: 'docs/notes.md' }],
        sha: '1111111',
        subject: 'docs: trim',
      },
    ],
    [],
  );
  const overLimit = evaluateRationale(
    [
      {
        files: [{ additions: 0, deletions: LARGE_DELETION_LINES + 1, path: 'docs/notes.md' }],
        sha: '2222222',
        subject: 'docs: trim',
      },
    ],
    [],
  );

  assert.equal(atLimit.ok, true);
  assert.equal(overLimit.ok, false);
});

test('a commit that does not say who wrote it is refused', () => {
  const verdict = evaluateTrailers([
    { body: 'Some prose about the change.', sha: '3333333', subject: 'feat: something' },
  ]);

  assert.equal(verdict.ok, false);
  assert.equal(verdict.missing.length, 1);
});

test('an Agent trailer attributes the commit', () => {
  const verdict = evaluateTrailers([
    { body: 'Some prose.\n\nAgent: claude-code', sha: '4444444', subject: 'feat: something' },
    { body: 'Agent: none', sha: '5555555', subject: 'fix: typo' },
  ]);

  assert.equal(verdict.ok, true);
});

/**
 * Bloated instruction files get ignored rather than followed, so the file that asks for
 * minimalism is held to it. Raise the cap in a commit someone can see, not silently.
 */
test('the agent instruction files stay short enough to be read', () => {
  const lines = ['AGENTS.md', 'CLAUDE.md']
    .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))
    .join('\n')
    .split('\n').length;

  assert.ok(lines <= 60, `AGENTS.md + CLAUDE.md are ${lines} lines; the cap is 60`);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  LARGE_DELETION_LINES,
  evaluate,
  nextDecisionNumber,
} from '../scripts/change-rationale';

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

test('a large deletion with no note is caught', () => {
  const verdict = evaluate([CONCEPT_LAB_DELETION], []);

  assert.equal(verdict.ok, false);
  assert.equal(verdict.findings.length, 1);
  assert.equal(verdict.findings[0].path, 'public/concept-lab.html');
  assert.equal(verdict.findings[0].deletions, 594);
});

test('the same deletion passes once a note explains it', () => {
  const verdict = evaluate(
    [CONCEPT_LAB_DELETION],
    ['docs/decisions/0002-drop-the-concept-lab.md'],
  );

  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.decisionFiles, ['docs/decisions/0002-drop-the-concept-lab.md']);
});

/**
 * The half that decides whether anyone keeps the guard. Everyday work — including reworded docs
 * and a regenerated lockfile — must pass silently, or the guard gets routed around.
 */
test('everyday work is not caught', () => {
  const verdict = evaluate(
    [
      {
        files: [
          { additions: 40, deletions: 12, path: 'src/app/index.tsx' },
          { additions: 6, deletions: 9, path: 'AGENTS.md' },
          { additions: 2, deletions: 2, path: 'docs/product-spec.md' },
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

test('the threshold is a boundary, not an approximation', () => {
  const at = evaluate(
    [
      {
        files: [{ additions: 0, deletions: LARGE_DELETION_LINES, path: 'docs/notes.md' }],
        sha: '1111111',
        subject: 'docs: trim',
      },
    ],
    [],
  );
  const over = evaluate(
    [
      {
        files: [{ additions: 0, deletions: LARGE_DELETION_LINES + 1, path: 'docs/notes.md' }],
        sha: '2222222',
        subject: 'docs: trim',
      },
    ],
    [],
  );

  assert.equal(at.ok, true);
  assert.equal(over.ok, false);
});

test('the suggested filename is the next free number', () => {
  assert.equal(nextDecisionNumber([]), '0001');
  assert.equal(
    nextDecisionNumber([
      'docs/decisions/README.md',
      'docs/decisions/TEMPLATE.md',
      'docs/decisions/0001-agent-workspace.md',
    ]),
    '0002',
  );
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

  // 60 was a guess made when these files held enforcement rules only. Raised to 75 on 2026-07-31
  // for the owner-communication section; published guidance puts the real risk nearer 200.
  assert.ok(lines <= 75, `AGENTS.md + CLAUDE.md are ${lines} lines; the cap is 75`);
});

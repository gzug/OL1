/**
 * Runs every check and reports every result.
 *
 * `check` used to be an `&&` chain, which meant the secret/PHI scan — second to last — was the
 * gate least likely to have run. The predecessor repository paid for exactly this: on 2026-07-27
 * a cosmetic line-count gate had been red for days, and the secret-leak scan sitting behind it in
 * the chain had not run at all. The rule that came out of it: a check that did not run must never
 * look like a check that passed.
 *
 * There is deliberately no skip flag. An exemption belongs in a diff someone can review, not in
 * an environment variable someone exports once.
 */

import { spawnSync } from 'node:child_process';

const STAGES = [
  'typecheck',
  'lint',
  'test',
  'check:boundaries',
  'check:durations',
  'check:dates',
  'check:sensitive',
  'export:web',
];

const results = [];

for (const stage of STAGES) {
  console.log(`\n──────── ${stage} ────────`);
  const { status } = spawnSync('npm', ['run', '--silent', stage], { stdio: 'inherit' });
  results.push({ passed: status === 0, stage });
}

console.log('\n──────── check ────────');
for (const { passed, stage } of results) {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${stage}`);
}

const failed = results.filter((result) => !result.passed);
if (failed.length > 0) {
  console.error(`\ncheck FAILED: ${failed.map((result) => result.stage).join(', ')}`);
  console.error(`Re-run just one of them, without waiting for the rest:\n`);
  for (const { stage } of failed) {
    console.error(`  npm run ${stage}`);
  }
  process.exit(1);
}

console.log('\ncheck passed: every stage ran and passed');

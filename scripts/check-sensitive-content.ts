import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { FORBIDDEN_FILE_PATTERN, findSecret } from './sensitive-patterns';

function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .filter((file) => !file.startsWith('node_modules/'))
    .filter((file) => !file.startsWith('dist/'));
}

async function main(): Promise<void> {
  const violations: string[] = [];

  for (const file of trackedFiles()) {
    if (FORBIDDEN_FILE_PATTERN.test(file)) {
      violations.push(`${file}: forbidden binary, credential, or data artifact`);
      continue;
    }

    let content: string;
    try {
      content = await readFile(file, 'utf8');
    } catch {
      continue;
    }

    if (findSecret(content)) {
      violations.push(`${file}: possible secret`);
    }
  }

  if (violations.length > 0) {
    console.error(`A file looks like it contains a secret or personal health data:\n`);
    for (const violation of violations) {
      console.error(`  ${violation}`);
    }
    console.error(`
Remove it from the file, then remove the file from git if it was already added:

  git rm --cached <file>   # then add it to .gitignore

If the match is harmless — a fixture, a type name, an example — the pattern is too broad.
Fix it in scripts/sensitive-patterns.ts and add the harmless case to
tests/sensitive-content.test.ts so it stays fixed. Do not skip the scan.`);
    process.exit(1);
  }

  console.log('Secret/PHI guard: no high-signal repository content found');
}

main();

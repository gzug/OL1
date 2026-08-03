/**
 * Screens never reach past `src/application/`.
 *
 * This used to scan `src/app/` alone, which made it a guard over five thin route files while every
 * real screen sits in `src/ui/`. `HomeMockup.tsx` could have imported SQLite directly and the check
 * would have stayed green — an empty baseline and a blind gate look identical, which is the exact
 * failure `AGENTS.md` warns about.
 *
 * `src/ui/` is in scope now. The layers below it are not, and must not be: `src/application/` exists
 * to import infrastructure, and `src/infrastructure/` is where the provider SDKs live.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Everything a screen may not reach for, whether by package name or by path alias. */
const forbidden = ['expo-sqlite', 'react-native-health-connect', '@/infrastructure/'];

const scanned = ['../src/app/', '../src/ui/'].map((relative) =>
  fileURLToPath(new URL(relative, import.meta.url)),
);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const violations = [];
for (const directory of scanned) {
  for (const file of await collectFiles(directory)) {
    const content = await readFile(file, 'utf8');
    for (const value of forbidden) {
      if (content.includes(value)) violations.push(`${file}: ${value}`);
    }
  }
}

if (violations.length > 0) {
  console.error(`Native boundary violations:\n${violations.join('\n')}`);
  console.error(
    `\nA screen may only reach as far as src/application/. Put the call behind a function there.`,
  );
  process.exit(1);
}

console.log(`Native boundaries: ok (${scanned.length} directories scanned)`);

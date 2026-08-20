/**
 * There is exactly one place that turns minutes into "7h 1m".
 *
 * PORTED from Legacy `scripts/assert-duration-formatters.js`, and its reason is the whole point.
 * On 2026-07-27 Legacy's owner opened a live preview and found a night of sleep printed as `417.4`.
 * The cause was not a missing unit: THREE private formatters existed for the same job, agreeing
 * only by luck, and one of them rounded hours and minutes independently — which is how "6 h 60 min"
 * reached a shipped screen.
 *
 * A second formatter is easy to write and impossible to notice. So the rule is a check:
 * `Math.floor(x / 60)` next to `% 60` outside the one file that owns it fails here.
 *
 * If a new place genuinely needs to write a duration, it imports `formatDuration` or
 * `formatDurationLong` from `src/application/format/metric.ts`. If THAT function is wrong, there is
 * one place to fix it, which was the entire argument for having it.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The one file allowed to do this arithmetic. */
const OWNER = 'src/application/format/metric.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const scanned = ['src/', 'scripts/'];

/** Minutes split into hours and a remainder — the shape every one of Legacy's copies had. */
const DIVIDES_BY_60 = /\/\s*60\b/;
const REMAINDER_OF_60 = /%\s*60\b/;

async function collect(directory) {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${directory}${entry.name}`;
    if (entry.isDirectory()) files.push(...(await collect(`${path}/`)));
    if (entry.isFile() && /\.(mjs|ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const violations = [];
for (const directory of scanned) {
  for (const file of await collect(directory)) {
    if (file === OWNER || file.endsWith('check-duration-formatters.mjs')) continue;
    const content = await readFile(join(root, file), 'utf8');
    if (DIVIDES_BY_60.test(content) && REMAINDER_OF_60.test(content)) violations.push(file);
  }
}

if (violations.length > 0) {
  console.error('A second duration formatter has appeared:\n');
  for (const file of violations) console.error(`  ${file}`);
  console.error(`
Only ${OWNER} may split minutes into hours and a remainder.

Legacy shipped three copies of this arithmetic. They agreed by luck until one of them rounded the
halves independently and printed "6 h 60 min" on a live screen. Import formatDuration or
formatDurationLong instead — and if the shared one is wrong, fix it there, which is the whole point
of it existing.`);
  process.exit(1);
}

console.log('Duration formatters: one definition, as intended');

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

/**
 * The product is called One L1fe, and it says so wherever anybody can read it.
 *
 * "OL1" is the repository, the branch prefix and the storage keys. It was never the product's name,
 * and it had leaked into six strings a person actually sees — a splash screen, the browser tab, a
 * note filed into their own health record, a permission refusal, and the sentence every coach is
 * given about who it is. The owner asked for the whole name on 2026-08-21.
 *
 * **What this guard deliberately does NOT touch.** The lowercase `ol1.` storage keys stay exactly as
 * they are, and the check below is case-sensitive so it can never be read as asking for them.
 * Renaming `ol1.hub.entries.sleep` would orphan every meal, session and blood panel already saved —
 * the same failure `catalog.ts` warns about for the `medical` hub id, where a label and an id are
 * allowed to disagree because one is read and the other is a foreign key.
 *
 * Comments are skipped: a note about the repository is documentation, not a product surface.
 *
 * **One exemption, and it is a true sentence rather than an escape hatch.** The About screen names
 * where One L1fe is built, and that address is `github.com/gzug/OL1` — the repository really is
 * called that. Tuning the guard for it in a visible diff is what `AGENTS.md` asks for when a check
 * fires on something harmless; the alternative was deleting a useful, accurate line to keep a regex
 * happy.
 */

const ROOT = new URL('../', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** The repository's own address, which is allowed to say OL1 because that is its name. */
const REPO = 'github.com/gzug/OL1';

/** A line with its comments and the repo address taken out, so only real claims are left. */
function code(line: string): string {
  return line
    .replace(/\/\*.*?\*\//g, ' ')
    .replace(/^\s*(\*|\/\/).*$/, '')
    .split(REPO)
    .join(' ');
}

test('nothing a person can read calls the product OL1', () => {
  const found: string[] = [];

  for (const path of files(SRC)) {
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (code(line).includes('OL1')) {
          found.push(`${relative(ROOT, path)}:${index + 1}  ${line.trim().slice(0, 76)}`);
        }
      });
  }

  assert.deepEqual(found, [], `the product is called One L1fe:\n${found.join('\n')}`);
});

/**
 * The other half, and the one that would cost real data. If this ever fails, somebody has "tidied"
 * the storage keys to match the product name and every entry already written has been orphaned.
 */
test('the storage keys are still ol1, and are meant to be', () => {
  const web = readFileSync(join(SRC, 'infrastructure/hubs/hubStore.web.ts'), 'utf8');

  assert.match(web, /'ol1\.hubs'/);
  assert.match(web, /'ol1\.hub\.entries\.'/);
  assert.ok(
    !/'oneL1fe\.|'one-l1fe\./i.test(web),
    'a storage key was renamed — every entry already saved is now unreachable',
  );
});

#!/usr/bin/env node
/**
 * A button press is a plan. A past-tense verb claims a performance.
 *
 * Pressing "Take a photo" used to file a meal as `camera` and a blood panel as `photo`, and both
 * `StoredEntries` and the Twin's ledger then reported **"photographed"** — under a heading reading
 * *"How it got here. Shown, never guessed at."* There is no camera anywhere in this app. The button
 * set a label and moved on to a step that asked for the numbers to be typed.
 *
 * Shape 3 of `docs/decisions/0013-a-sentence-that-outlived-its-truth.md`.
 *
 * ## The rule
 *
 * At a `.add(...)` call site, the entry's `source` must be a LITERAL from the honest set.
 *
 * Stricter than rejecting the wrong literal, and deliberately: the original defect was
 * `source: way` and `{ source }` — a value carried in from a button handler — so a guard checking
 * only literals would have watched the real bug go past. A provenance assembled somewhere else
 * cannot be verified here, so it is refused rather than trusted.
 *
 * ## Scope
 *
 * Only object-property position inside an `.add(...)` call. `panelPayload(entries, source, …)`
 * passes the chosen route as a positional argument and is untouched — what somebody CHOSE is worth
 * keeping, in the payload, where it records what they wanted rather than what the app did.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

/**
 * Provenance the app can honestly claim. Each is something it really does.
 *
 * `camera`, `photo`, `library` and `file` are absent because nothing here captures or reads an
 * image. One goes back in the same commit that adds the capability, and never before it.
 */
const HONEST = ['manual', 'chat', 'described'];

const ALLOWED = new RegExp(`^source\\s*:\\s*['"\`](?:${HONEST.join('|')})['"\`]\\s*,?$`);
/** `source:` or the `source,` shorthand, at the start of a line — object-property position. */
const PROPERTY = /^source\s*(?::|,|$)/;
/** How far past `.add(` an options object can reasonably run. */
const WINDOW = 12;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const found = [];

for (const path of files(join(ROOT, 'src'))) {
  const rel = relative(ROOT, path);
  const lines = readFileSync(path, 'utf8').split('\n');

  lines.forEach((line, index) => {
    if (!/\.add\s*\(/.test(line)) return;

    for (let cursor = index; cursor < Math.min(index + WINDOW, lines.length); cursor += 1) {
      const text = (lines[cursor] ?? '').trim();
      if (text.startsWith('*') || text.startsWith('//')) continue;
      if (PROPERTY.test(text) && !ALLOWED.test(text)) {
        found.push(`${rel}:${cursor + 1}  ${text.slice(0, 72)}`);
      }
    }
  });
}

if (found.length > 0) {
  console.error("An entry's provenance is not a literal the app can honestly claim:\n");
  for (const line of found) console.error(`  ${line}`);
  console.error(
    `\nAllowed: ${HONEST.map((value) => `'${value}'`).join(', ')}.` +
      '\nKeep the route somebody chose in the payload instead — see docs/decisions/0013.',
  );
  process.exit(1);
}

console.log('check:provenance — nothing claims an act it did not perform');

#!/usr/bin/env node
/**
 * A date typed into application code is a clock that stops.
 *
 * `LabUploadFlow.tsx` carried `const TODAY = '2026-08-03'` as its idea of the present. It was true
 * for one day. Eighteen days later it rejected every genuine draw date from the 4th onward as being
 * in the future, killed the Approve button with nothing on screen explaining why, and pushed people
 * into clearing the field — which stamped their blood panel with the moment they pressed the
 * button. Found by an audit, not by CI, because nothing here could see it.
 *
 * This is that guard. A hard-coded calendar date in `src/` fails the build.
 *
 * **Not tests, and not fixtures.** A test needs a fixed clock to be a test at all, and the hub
 * fixtures are explicitly invented sample content — both are excluded by path, visibly, rather than
 * by an escape hatch a future file could opt into.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SEARCH = join(ROOT, 'src');

/** Sample content, and it says so in its own headers. A date there is part of the fixture. */
const ALLOWED = ['src/ui/mockup/fixtures.ts', 'src/ui/hubs/states/'];

/** `2026-08-03`, `2026/08/03`, and the same inside an ISO timestamp. */
const DATE = /(["'`])\d{4}[-/]\d{2}[-/]\d{2}(?:[T ]\d{2}:\d{2})?/g;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const found = [];

for (const path of files(SEARCH)) {
  const rel = relative(ROOT, path);
  if (ALLOWED.some((allowed) => rel.startsWith(allowed))) continue;

  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, index) => {
    // A date inside a comment is documentation — "renamed on 2026-08-21" — not a value.
    const code = line.replace(/\/\*.*?\*\//g, ' ').replace(/^\s*[*/].*$/, '');
    for (const match of code.matchAll(DATE)) {
      found.push(`${rel}:${index + 1}  ${match[0]}${match[1]}…`);
    }
  });
}

if (found.length > 0) {
  console.error('A calendar date is hard-coded in application code. That is a clock that stops:\n');
  for (const line of found) console.error(`  ${line}`);
  console.error('\nUse the device clock. If this is genuinely sample content, it belongs in a fixture.');
  process.exit(1);
}

console.log('check:dates — no frozen clocks in src/');

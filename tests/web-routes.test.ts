import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

/**
 * The deployed site 404'd on every route except `/`, for as long as there had been more than one
 * route. `npm run check` was green throughout: `export:web` proves the files are *written*, and says
 * nothing about whether the host can *serve* them.
 *
 * Expo's static export writes one file per route — `twin.html`, `table.html`, `hub/[id].html`. A
 * request for `/twin` finds no file called `twin`, and `/hub/mind` finds no directory called `mind`.
 * `index.html` was the only name Vercel resolved on its own, which is exactly why Home looked fine
 * and hid the problem.
 *
 * So: `cleanUrls` maps `/twin` to `twin.html`, and every dynamic segment needs its own rewrite,
 * because `[id]` is a literal filename rather than a pattern the host understands.
 */

const APP_DIR = new URL('../src/app/', import.meta.url).pathname;
const config = JSON.parse(
  readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
) as {
  cleanUrls?: boolean;
  rewrites?: readonly { destination: string; source: string }[];
};

/** Route files, as URL paths. `index` is the root; `+html` and `_layout` are not routes. */
function routePaths(dir = APP_DIR, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return routePaths(join(dir, entry.name), `${prefix}/${entry.name}`);
    if (!entry.name.endsWith('.tsx')) return [];
    const name = entry.name.replace(/\.tsx$/, '');
    if (name.startsWith('+') || name.startsWith('_')) return [];
    return [name === 'index' ? `${prefix}/` : `${prefix}/${name}`];
  });
}

test('clean URLs are on, or every route but the root is a 404', () => {
  assert.equal(
    config.cleanUrls,
    true,
    'vercel.json must set cleanUrls, or /twin looks for a file named "twin" and finds twin.html',
  );
});

test('every dynamic route has a rewrite, or its segment is read as a literal folder name', () => {
  const dynamic = routePaths().filter((route) => route.includes('['));

  for (const route of dynamic) {
    // "/hub/[id]" is served from that literal filename; the request that has to reach it is "/hub/<anything>".
    const requestPattern = route.replace(/\[([^\]]+)\]/g, ':$1');
    const rewrite = config.rewrites?.find((entry) => entry.source === requestPattern);

    assert.ok(
      rewrite !== undefined,
      `no rewrite for "${requestPattern}" — a request to it would 404 on the deployed site`,
    );
    assert.equal(
      rewrite?.destination,
      route,
      `the rewrite for "${requestPattern}" must point at "${route}", the file the export actually writes`,
    );
  }

  // A guard with an empty baseline and a blind gate look identical. This is the app's only dynamic
  // route today; if it ever becomes none, the loop above stops asserting anything at all.
  assert.ok(dynamic.length > 0, 'no dynamic routes found — this guard has stopped checking anything');
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { FORBIDDEN_FILE_PATTERN, findSecret } from '../scripts/sensitive-patterns';

/**
 * Every fixture below is assembled at runtime from fragments. Written as literals they would be
 * real matches, and this test file would trip the scanner it is testing.
 */
const secrets = {
  apiKey: `AIza${'k'.repeat(35)}`,
  bearer: `Bearer ${'t'.repeat(24)}`,
  githubToken: `gh${'p'}_${'A'.repeat(36)}`,
  openAiKey: `sk${'-'}${'q'.repeat(32)}`,
  patient: `${'patientName'}: 'Jane Doe'`,
  privateKey: `-----BEGIN ${'PRIVATE'} KEY-----`,
};

for (const [name, content] of Object.entries(secrets)) {
  test(`the scanner flags a ${name}`, () => {
    assert.notEqual(findSecret(content), null);
  });
}

test('the scanner flags credential and database file extensions', () => {
  for (const file of ['release.keystore', 'upload.jks', 'health.sqlite', 'app.apk', 'key.p8']) {
    assert.ok(FORBIDDEN_FILE_PATTERN.test(file), file);
  }

  for (const file of ['src/core/health.ts', 'docs/product-spec.md', 'README.md']) {
    assert.equal(FORBIDDEN_FILE_PATTERN.test(file), false, file);
  }
});

/**
 * The false-positive half. A guard that cries wolf on ordinary code gets weakened rather than
 * fixed, so the content this repository actually contains is pinned as clean.
 */
test('the scanner stays quiet on ordinary repository content', () => {
  const ordinary = [
    "provenance: 'fixture'",
    "source: 'controlled-preview-fixture'",
    "start: '2026-01-01T00:00:00.000Z'",
    "timezone: 'Australia/Sydney'",
    "package: 'com.onel1fe.mobile.dev'",
    "export type HealthMetric = 'steps';",
    'CREATE TABLE IF NOT EXISTS bootstrap_probe (id INTEGER PRIMARY KEY NOT NULL);',
    'const token = process.env.EXPO_TOKEN;',
  ];

  for (const content of ordinary) {
    assert.equal(findSecret(content), null, content);
  }
});

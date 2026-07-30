import assert from 'node:assert/strict';
import test from 'node:test';
import type { ConfigContext } from 'expo/config';

import createConfig, { APP_VARIANTS, requireAppVariant } from '../app.config';

test('missing APP_VARIANT fails closed', () => {
  assert.throws(() => requireAppVariant(undefined), /APP_VARIANT/);
});

test('unknown APP_VARIANT fails closed', () => {
  assert.throws(() => requireAppVariant('production'), /APP_VARIANT/);
});

for (const appVariant of ['development', 'preview'] as const) {
  test(`${appVariant} name and identifiers stay paired`, () => {
    process.env.APP_VARIANT = appVariant;
    const context: ConfigContext = {
      config: { name: '', slug: '' },
      packageJsonPath: '',
      projectRoot: '',
      staticConfigPath: null,
    };
    const config = createConfig(context);
    const expected = APP_VARIANTS[appVariant];

    assert.equal(config.name, expected.name);
    assert.equal(config.android?.package, expected.androidPackage);
    assert.equal(config.ios?.bundleIdentifier, expected.bundleIdentifier);
    assert.notEqual(config.android?.package, 'com.onel1fe.mobile');
    assert.notEqual(config.ios?.bundleIdentifier, 'com.onel1fe.mobile');
  });
}

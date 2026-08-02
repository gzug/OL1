import assert from 'node:assert/strict';
import test from 'node:test';

import { banner } from '../src/ui/mockup/tokens';
import { darkColors, lightColors, type ThemeColors } from '../src/ui/theme/tokens';

/**
 * A theme ships in two halves, and only one of them is ever on screen while it is being built. A
 * key added to light and forgotten in dark looks perfect right up until someone switches modes.
 */
test('light and dark define exactly the same keys', () => {
  assert.deepEqual(Object.keys(lightColors).sort(), Object.keys(darkColors).sort());
});

test('no colour is left empty in either theme', () => {
  for (const [name, colors] of [
    ['light', lightColors],
    ['dark', darkColors],
  ] as const) {
    for (const [key, value] of Object.entries(colors)) {
      assert.equal(typeof value, 'string', `${name}.${key} must be a string`);
      assert.notEqual(value.trim(), '', `${name}.${key} must not be empty`);
    }
  }
});

test('each theme reports the status bar its background needs', () => {
  // Dark icons on the light paper, light icons on the charcoal. Getting this backwards makes the
  // clock and battery invisible, which no screenshot review ever catches.
  assert.equal(lightColors.statusBar, 'dark');
  assert.equal(darkColors.statusBar, 'light');
});

/**
 * The mockup banner must never be mistaken for product UI. If its amber ever equals a real token
 * it has started to look like the app, which is the one thing it cannot do.
 */
test('the mockup banner stays outside both palettes', () => {
  const paletteValues = (colors: ThemeColors) =>
    Object.entries(colors)
      .filter(([key]) => key !== 'statusBar')
      .map(([, value]) => value.toLowerCase());

  for (const colors of [lightColors, darkColors]) {
    assert.ok(
      !paletteValues(colors).includes(banner.background.toLowerCase()),
      'banner background must not be a themed colour',
    );
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { healthAdapter } from '../src/infrastructure/health/healthAdapter.web';

test('web health data is explicit fixture provenance', async () => {
  const result = await healthAdapter.read({
    metric: 'steps',
    range: {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-01-02T00:00:00.000Z',
    },
    timezone: 'Australia/Sydney',
    unit: 'count',
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.data[0]?.provenance, 'fixture');
  assert.equal(result.data[0]?.source, 'controlled-preview-fixture');
});

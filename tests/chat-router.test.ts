import assert from 'node:assert/strict';
import test from 'node:test';

import type { ChatRequest } from '../src/core/chat';
import { createChatModel, TIER_TIMEOUTS_MS } from '../src/infrastructure/llm/llmRouter';

/**
 * The retry policy, and the property this whole layer exists for.
 *
 * Legacy's router ends its cascade by RESOLVING with a canned apology tagged `static-stub`, so a
 * failed call is shaped exactly like a successful one. Every caller has to remember to check. The
 * last test here is the assertion that this cannot happen again — not that the current code checks,
 * but that there is no success shape a failure could occupy.
 */

const REQUEST: ChatRequest = { history: [], message: 'why am I tired', systemPrompt: 'be brief' };

function failWith(status: number): Error & { httpStatus: number } {
  return Object.assign(new Error(`status ${status}`), { httpStatus: status });
}

function timeout(): Error & { isTimeout: boolean } {
  return Object.assign(new Error('too slow'), { isTimeout: true });
}

test('a missing key never reaches the network', async () => {
  let called = false;
  const model = createChatModel({
    attempt: async () => {
      called = true;
      return 'should not happen';
    },
    configured: () => false,
  });

  const reply = await model.generate(REQUEST);
  assert.equal(called, false);
  assert.equal(reply.status, 'unavailable');
  assert.equal(reply.status === 'unavailable' && reply.reason, 'not-configured');
});

test('a rate limit is retried, and the answer that follows is the answer', async () => {
  const timeouts: number[] = [];
  let attempts = 0;
  const model = createChatModel({
    attempt: async (_request, timeoutMs) => {
      timeouts.push(timeoutMs);
      attempts += 1;
      if (attempts === 1) throw failWith(429);
      return 'here is the answer';
    },
    configured: () => true,
  });

  const reply = await model.generate(REQUEST);
  assert.equal(reply.status, 'ok');
  assert.equal(reply.status === 'ok' && reply.text, 'here is the answer');
  assert.deepEqual(timeouts, [TIER_TIMEOUTS_MS[0], TIER_TIMEOUTS_MS[1]]);
});

test('a bad gateway is retried too, and giving up is not an answer', async () => {
  let attempts = 0;
  const model = createChatModel({
    attempt: async () => {
      attempts += 1;
      throw failWith(503);
    },
    configured: () => true,
  });

  const reply = await model.generate(REQUEST);
  assert.equal(attempts, TIER_TIMEOUTS_MS.length, 'every tier should have been tried');
  assert.equal(reply.status, 'unavailable');
});

test('a bad key stops dead — cascading only hides it', async () => {
  for (const status of [401, 403]) {
    let attempts = 0;
    const model = createChatModel({
      attempt: async () => {
        attempts += 1;
        throw failWith(status);
      },
      configured: () => true,
    });

    const reply = await model.generate(REQUEST);
    assert.equal(attempts, 1, `${status} must not be retried`);
    assert.equal(reply.status === 'unavailable' && reply.reason, 'refused');
  }
});

test('a timeout is final, because the same model gets less time on the next tier', async () => {
  let attempts = 0;
  const model = createChatModel({
    attempt: async () => {
      attempts += 1;
      throw timeout();
    },
    configured: () => true,
  });

  const reply = await model.generate(REQUEST);
  assert.equal(attempts, 1);
  assert.equal(reply.status === 'unavailable' && reply.reason, 'timeout');
});

test('the timeout ladder only ever shrinks, so three attempts cannot outlast three of the first', () => {
  const total = TIER_TIMEOUTS_MS.reduce((sum, value) => sum + value, 0);
  assert.ok(total < TIER_TIMEOUTS_MS[0] * TIER_TIMEOUTS_MS.length);
  for (let i = 1; i < TIER_TIMEOUTS_MS.length; i += 1) {
    assert.ok(TIER_TIMEOUTS_MS[i] < TIER_TIMEOUTS_MS[i - 1]);
  }
});

test('no failure can wear an answer’s shape — the static-stub bug cannot come back', async () => {
  const failures = [failWith(429), failWith(500), failWith(401), timeout(), new Error('offline')];

  for (const failure of failures) {
    const model = createChatModel({
      attempt: async () => {
        throw failure;
      },
      configured: () => true,
    });

    const reply = await model.generate(REQUEST);
    assert.equal(reply.status, 'unavailable', `${failure.message} returned a success`);
    // The point is structural, not behavioural: an unavailable reply has no `text` to read at all,
    // so a caller cannot accidentally render an apology as though a coach had said it.
    assert.equal('text' in reply, false);
  }
});

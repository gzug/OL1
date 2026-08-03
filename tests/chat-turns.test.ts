import assert from 'node:assert/strict';
import test from 'node:test';

import type { ChatTurn } from '../src/core/chat';
import { dropPendingTurn, isPending, resolvePendingTurn } from '../src/ui/chat/chatTurns';

/**
 * The optimistic placeholder is the one piece of chat state that can strand the screen: Legacy
 * shipped a spinner that ran forever because a failed generation left the empty assistant turn in
 * place. These assertions are what stop that shape coming back.
 */

const user = (text: string): ChatTurn => ({ id: `u-${text}`, role: 'user', text });
const said = (text: string): ChatTurn => ({ id: `a-${text}`, role: 'assistant', text });
const pending: ChatTurn = { id: 'pending', role: 'assistant', text: '' };

test('only an empty assistant turn is pending', () => {
  assert.equal(isPending(pending), true);
  assert.equal(isPending(said('an answer')), false);
  assert.equal(isPending(user('')), false, 'an empty user turn is not the thinking placeholder');
  assert.equal(isPending(undefined), false);
});

test('a failed generation leaves no placeholder behind', () => {
  const turns = [user('why am I tired'), pending];
  assert.deepEqual(dropPendingTurn(turns), [user('why am I tired')]);
});

test('a persisted question with no reply survives untouched', () => {
  // The bar on Home hands over in exactly this shape, so dropping it would lose the question.
  const turns = [user('why am I tired')];
  assert.deepEqual(dropPendingTurn(turns), turns);
});

test('a real answer is never dropped', () => {
  const turns = [user('hello'), said('hello back')];
  assert.deepEqual(dropPendingTurn(turns), turns);
});

test('dropping never mutates its input', () => {
  const turns = [user('a'), pending];
  const before = [...turns];
  dropPendingTurn(turns);
  assert.deepEqual(turns, before);
});

test('the answer replaces the placeholder rather than following it', () => {
  const resolved = resolvePendingTurn([user('hi'), pending], 'an answer');
  assert.equal(resolved.length, 2);
  assert.equal(resolved[1].text, 'an answer');
});

test('an answer with no placeholder waiting is appended, not dropped', () => {
  const resolved = resolvePendingTurn([user('hi')], 'an answer');
  assert.equal(resolved.length, 2);
  assert.equal(resolved[1].role, 'assistant');
  assert.equal(resolved[1].text, 'an answer');
});

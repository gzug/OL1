import assert from 'node:assert/strict';
import test from 'node:test';

import { createCoachChat } from '../src/application/chat/coachChat';
import { createMemoryChatStore } from '../src/infrastructure/chat/chatStore';
import type { ChatModel, CoachDescriptor } from '../src/core/chat';

/**
 * What the owner asked for on 2026-08-19, asserted end to end through the application layer:
 * a coach can have several conversations, and jumping back into one lands in that one.
 */

const sleep: CoachDescriptor = { focus: 'Sleep.', id: 'sleep', name: 'Sleep Coach' };

/** Answers everything the same way. What is being tested here is which thread it is written into. */
const model: ChatModel = {
  generate: async () => ({ model: 'test', status: 'ok', text: 'an answer' }),
  isConfigured: () => true,
};

test('the same coach can hold two separate conversations', async () => {
  const chat = createCoachChat(model, createMemoryChatStore());

  const first = await chat.start(['sleep']);
  await chat.persist(first, ['sleep'], 'why am I tired');

  const second = await chat.start(['sleep']);
  await chat.persist(second, ['sleep'], 'what about naps');

  assert.notEqual(first, second);
  assert.deepEqual((await chat.readTurns(first)).map((turn) => turn.text), ['why am I tired']);
  assert.deepEqual((await chat.readTurns(second)).map((turn) => turn.text), ['what about naps']);
  assert.equal((await chat.listThreads()).length, 2);
});

test('resuming a coach opens the conversation it was last in, not a new one', async () => {
  const chat = createCoachChat(model, createMemoryChatStore());

  const first = await chat.start(['sleep']);
  await chat.persist(first, ['sleep'], 'why am I tired');

  assert.equal(await chat.resume(['sleep']), first);
  assert.equal((await chat.listThreads()).length, 1, 'resuming made a second conversation');
});

test('resuming a coach nobody has spoken to starts one', async () => {
  const chat = createCoachChat(model, createMemoryChatStore());

  const id = await chat.resume(['sleep']);
  assert.ok(id.length > 0);
  assert.deepEqual(await chat.readTurns(id), []);
});

/**
 * The answer must land in the thread it was asked in. While ids were derived this was automatic;
 * now it is a parameter, which is exactly the kind of thing that goes wrong silently.
 */
test('an answer is written into the conversation the question was asked in', async () => {
  const chat = createCoachChat(model, createMemoryChatStore());

  const first = await chat.start(['sleep']);
  const second = await chat.start(['sleep']);
  await chat.persist(second, ['sleep'], 'what about naps');

  const reply = await chat.answer(second, [sleep]);

  assert.equal(reply?.status, 'ok');
  assert.deepEqual((await chat.readTurns(first)).length, 0, 'the answer went to the wrong thread');
  assert.deepEqual(
    (await chat.readTurns(second)).map((turn) => turn.role),
    ['user', 'assistant'],
  );
});

test('a conversation with nothing waiting is not answered again', async () => {
  const chat = createCoachChat(model, createMemoryChatStore());

  const id = await chat.start(['sleep']);
  await chat.persist(id, ['sleep'], 'why am I tired');
  await chat.answer(id, [sleep]);

  assert.equal(await chat.answer(id, [sleep]), null);
  assert.equal((await chat.readTurns(id)).length, 2, 'reopening re-asked the last question');
});

/**
 * Threads written before ids stopped being derived keep their ids and become ordinary
 * conversations. Nothing is migrated, so this is the assertion that nothing needs to be.
 */
test('a conversation from the old derived-id scheme still resumes', async () => {
  const store = createMemoryChatStore();
  const chat = createCoachChat(model, store);

  await store.createThread({
    coachIds: ['sleep'],
    createdAt: '2026-08-03T10:00:00.000Z',
    id: 'chat_sleep',
    updatedAt: '2026-08-03T10:00:00.000Z',
  });
  await store.appendTurn('chat_sleep', { id: 't1', role: 'user', text: 'from before' });

  assert.equal(await chat.resume(['sleep']), 'chat_sleep');
});

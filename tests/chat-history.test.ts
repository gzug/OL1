import assert from 'node:assert/strict';
import test from 'node:test';

import { historyEntries, shortPreview, threadTitle } from '../src/application/chat/history';
import { threadIdFor } from '../src/application/chat/threads';
import type { ChatThreadSummary } from '../src/core/chat';
import { createMemoryChatStore } from '../src/infrastructure/chat/chatStore';
import { selectableCoaches } from '../src/ui/chat/coachList';

const COACHES = selectableCoaches();

function summary(over: Partial<ChatThreadSummary> = {}): ChatThreadSummary {
  return {
    coachIds: [],
    createdAt: '2026-08-01T10:00:00.000Z',
    id: 'chat_general',
    preview: 'why am I tired',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...over,
  };
}

test('a thread is named by its coaches, and by "Assistant" when it has none', () => {
  assert.equal(threadTitle([], COACHES), 'Assistant');
  assert.equal(threadTitle(['sleep'], COACHES), 'Sleep Coach');
  assert.equal(threadTitle(['sleep', 'activity'], COACHES), 'Sleep Coach, Activity Coach');
});

test('a coach that no longer exists does not blank out a thread’s name', () => {
  // Hubs are data and can be deleted, so a stored thread can name a coach that is gone. The row
  // still has to say something a person can recognise.
  assert.equal(threadTitle(['sleep', 'deleted-hub'], COACHES), 'Sleep Coach');
  assert.equal(threadTitle(['deleted-hub'], COACHES), 'Assistant');
});

test('a preview is one line, and only says it was cut when it was', () => {
  assert.equal(shortPreview('  why   am I\ntired  '), 'why am I tired');
  assert.equal(shortPreview('exactly ten', 11), 'exactly ten');
  assert.equal(shortPreview('far too long to fit', 10), 'far too l…');
  assert.ok(!shortPreview('short', 10).endsWith('…'));
});

test('a thread with no question in it is not offered', () => {
  // `persist` creates the thread and appends in two steps. A crash between them leaves a named row
  // with nothing in it, and a history entry that opens an empty conversation is worse than none.
  const entries = historyEntries(
    [summary({ id: 'a' }), summary({ id: 'b', preview: '' }), summary({ id: 'c', preview: '   ' })],
    COACHES,
  );
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ['a'],
  );
});

test('the store’s order survives, because only the store knows when a turn landed', () => {
  const entries = historyEntries(
    [
      summary({ id: 'newest', updatedAt: '2026-08-03T10:00:00.000Z' }),
      summary({ id: 'oldest', updatedAt: '2026-08-01T10:00:00.000Z' }),
    ],
    COACHES,
  );
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ['newest', 'oldest'],
  );
});

test('reopening a row lands in the same conversation it came from', async () => {
  const store = createMemoryChatStore();
  const coachIds = ['sleep', 'activity'];
  const id = threadIdFor(coachIds);

  await store.createThread({
    coachIds,
    createdAt: '2026-08-01T10:00:00.000Z',
    id,
    updatedAt: '2026-08-01T10:00:00.000Z',
  });
  await store.appendTurn(id, { id: 't1', role: 'user', text: 'why am I tired' });

  const [entry] = historyEntries(await store.listThreads(), COACHES);
  assert.equal(entry.title, 'Sleep Coach, Activity Coach');
  assert.equal(entry.preview, 'why am I tired');
  // The row hands back coach ids, and the id derived from them is the thread it came from. That is
  // what makes reopening a selection rather than a lookup.
  assert.equal(threadIdFor(entry.coachIds), entry.id);
});

test('the list carries the first question, not the latest one', async () => {
  const store = createMemoryChatStore();
  await store.createThread({
    coachIds: [],
    createdAt: '2026-08-01T10:00:00.000Z',
    id: 'chat_general',
    updatedAt: '2026-08-01T10:00:00.000Z',
  });
  await store.appendTurn('chat_general', { id: '1', role: 'user', text: 'first' });
  await store.appendTurn('chat_general', { id: '2', role: 'assistant', text: 'an answer' });
  await store.appendTurn('chat_general', { id: '3', role: 'user', text: 'second' });

  const [entry] = historyEntries(await store.listThreads(), COACHES);
  assert.equal(entry.preview, 'first', 'a row that renamed itself on every message would not be findable');
});

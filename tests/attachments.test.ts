import assert from 'node:assert/strict';
import test from 'node:test';

import {
  describe as describeAttachment,
  holdForHandoff,
  pickProblem,
  takeHeld,
  toRef,
} from '../src/application/chat/attachments';
import { MAX_INLINE_BYTES, type Attachment } from '../src/core/attachments';
import { kindOf, toBase64 } from '../src/infrastructure/attachments/base64';

const PHOTO: Attachment = {
  bytes: 'AAAA',
  kind: 'image',
  mimeType: 'image/jpeg',
  name: 'meal.jpg',
  sizeBytes: 2_400_000,
};

/**
 * `toBase64` is written out here rather than taken from a package, so it is tested against the
 * thing it replaces. Node has `Buffer`; the app does not, which is exactly why this exists.
 */
test('base64 matches Node’s own encoder, including every padding case', () => {
  for (const input of ['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar', 'any carnal pleasure.']) {
    const bytes = new TextEncoder().encode(input);
    assert.equal(toBase64(bytes), Buffer.from(bytes).toString('base64'), `"${input}"`);
  }
});

test('base64 survives bytes that are not text, and lengths that cross the chunk boundary', () => {
  for (const length of [1, 2, 3, 255, 256, 98_303, 98_304, 98_305, 150_000]) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) bytes[i] = (i * 31 + 7) % 256;
    assert.equal(
      toBase64(bytes),
      Buffer.from(bytes).toString('base64'),
      `${length} bytes — a chunked encoder that pads mid-stream fails exactly here`,
    );
  }
});

test('a mime type becomes one of the four kinds, and anything unknown is a file', () => {
  assert.equal(kindOf('image/heic'), 'image');
  assert.equal(kindOf('video/quicktime'), 'video');
  assert.equal(kindOf('audio/mp4'), 'audio');
  assert.equal(kindOf('application/pdf'), 'document');
  assert.equal(kindOf(''), 'document');
});

test('what is kept about an attachment never includes its content', () => {
  const ref = toRef(PHOTO);
  assert.deepEqual(Object.keys(ref).sort(), ['kind', 'name', 'sizeBytes']);
  assert.equal('bytes' in ref, false, 'a photo of a meal must not be persisted');
  assert.equal('mimeType' in ref, false);
});

test('the size limit is named in the message, because it is the only one anyone can act on', () => {
  const message = pickProblem({ reason: 'too-large', status: 'failed' });
  assert.ok(message !== null);
  assert.ok(message.includes(String(Math.round(MAX_INLINE_BYTES / 1024 / 1024))));
});

test('every failure reason has words, and nothing else does', () => {
  for (const reason of ['denied', 'too-large', 'unavailable', 'unreadable'] as const) {
    assert.ok((pickProblem({ reason, status: 'failed' }) ?? '').length > 0, reason);
  }
  assert.equal(pickProblem({ status: 'cancelled' }), null, 'a cancelled picker is not a problem');
  assert.equal(pickProblem({ attachment: PHOTO, status: 'ok' }), null);
});

test('an attachment is described by name and size, in the larger unit once it earns one', () => {
  assert.equal(describeAttachment(toRef(PHOTO)), 'meal.jpg · 2.3 MB');
  assert.equal(
    describeAttachment({ kind: 'audio', name: 'voice note', sizeBytes: 40_960 }),
    'voice note · 40 KB',
  );
  // Never "0 KB": a recording that exists is not nothing, and a zero reads as a failed capture.
  assert.equal(
    describeAttachment({ kind: 'document', name: 'tiny.txt', sizeBytes: 12 }),
    'tiny.txt · 1 KB',
  );
});

test('the handoff hands over exactly once', () => {
  holdForHandoff(PHOTO);
  assert.equal(takeHeld(), PHOTO);
  // The second read is the one that matters: reopening a thread must not re-send an old photo to
  // the model, which is what a holder that kept its value would do on every visit.
  assert.equal(takeHeld(), undefined);
});

test('nothing held is not an error', () => {
  assert.equal(takeHeld(), undefined);
});

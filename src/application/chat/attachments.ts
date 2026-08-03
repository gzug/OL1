/**
 * Attaching something, as a screen sees it.
 *
 * The pickers and the recorder are native modules; a screen may not reach them. This is the whole
 * of what `ChatBar` calls, and `scripts/check-boundaries.mjs` is what keeps it that way.
 */

import {
  MAX_INLINE_BYTES,
  type Attachment,
  type AttachmentRef,
  type PickResult,
} from '@/core/attachments';
import { attachmentPicker } from '@/infrastructure/attachments/picker';
import { voiceRecorder } from '@/infrastructure/attachments/recorder';

export const attachments = {
  canRecord: () => voiceRecorder.isAvailable(),
  pickDocument: () => attachmentPicker.pickDocument(),
  pickMedia: () => attachmentPicker.pickMedia(),
  startRecording: () => voiceRecorder.start(),
  stopRecording: () => voiceRecorder.stop(),
};

/** What is kept once the message is sent: everything except the content. */
export function toRef(attachment: Attachment): AttachmentRef {
  return { kind: attachment.kind, name: attachment.name, sizeBytes: attachment.sizeBytes };
}

/**
 * The bytes, held across the one navigation between Home's bar and the chat screen.
 *
 * The question itself travels through the store — that is the persist-first handoff. An attachment
 * cannot: the store keeps metadata, never content, so a photo attached on Home would arrive as a
 * name and a size with nothing behind it, and the model would be asked about a picture it was
 * never given.
 *
 * In memory, taken exactly once, and never written anywhere. If the handoff does not happen the
 * bytes are collected with everything else, which is the correct outcome for a photo of a meal.
 */
let held: Attachment | null = null;

export function holdForHandoff(attachment: Attachment): void {
  held = attachment;
}

/** Returns the held attachment and forgets it, so a reopened thread never re-sends an old photo. */
export function takeHeld(): Attachment | undefined {
  const value = held;
  held = null;
  return value ?? undefined;
}

/**
 * What a failed pick says, in the person's words rather than the platform's.
 *
 * `too-large` names the limit, because it is the only one of these the person can do something
 * about — and until the Files API is built it is a real ceiling rather than a preference.
 */
export function pickProblem(result: PickResult): string | null {
  if (result.status !== 'failed') return null;

  switch (result.reason) {
    case 'denied':
      return 'OL1 was not given access to that. You can change it in your phone’s settings.';
    case 'too-large':
      return `That is bigger than ${Math.round(MAX_INLINE_BYTES / 1024 / 1024)}MB, which is as much as can be sent in one go.`;
    case 'unavailable':
      return 'That is not available here.';
    case 'unreadable':
      return 'That file could not be read.';
  }
}

/** How an attachment is described in the composer and in the transcript. */
export function describe(ref: AttachmentRef): string {
  const size =
    ref.sizeBytes >= 1024 * 1024
      ? `${(ref.sizeBytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(ref.sizeBytes / 1024))} KB`;

  return `${ref.name} · ${size}`;
}

/**
 * Picking something to attach, in a browser.
 *
 * A plain `<input type="file">` rather than `expo-image-picker`'s web shim: on the web the two do
 * exactly the same thing, and this one has no permission model to get wrong and nothing to fail
 * during the static export, which renders these routes in Node where `document` does not exist.
 */

import {
  MAX_INLINE_BYTES,
  type AttachmentPicker,
  type PickResult,
} from '@/core/attachments';

import { kindOf, toBase64 } from './base64';

function pick(accept: string): Promise<PickResult> {
  if (typeof document === 'undefined') {
    return Promise.resolve({ reason: 'unavailable' as const, status: 'failed' as const });
  }

  return new Promise<PickResult>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;

    // A cancelled picker fires nothing in older browsers, so the promise would hang forever and the
    // composer would sit disabled. `cancel` covers the modern path; losing focus covers the rest.
    let settled = false;
    const finish = (result: PickResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    input.addEventListener('cancel', () => finish({ status: 'cancelled' }));
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file === undefined) {
        finish({ status: 'cancelled' });
        return;
      }
      if (file.size > MAX_INLINE_BYTES) {
        finish({ reason: 'too-large', status: 'failed' });
        return;
      }

      void file
        .arrayBuffer()
        .then((buffer) => {
          const mimeType = file.type.length > 0 ? file.type : 'application/octet-stream';
          finish({
            attachment: {
              bytes: toBase64(new Uint8Array(buffer)),
              kind: kindOf(mimeType),
              mimeType,
              name: file.name,
              sizeBytes: file.size,
            },
            status: 'ok',
          });
        })
        .catch(() => finish({ reason: 'unreadable', status: 'failed' }));
    });

    input.click();
  });
}

export const attachmentPicker: AttachmentPicker = {
  pickDocument: () => pick('*/*'),
  pickMedia: () => pick('image/*,video/*'),
};

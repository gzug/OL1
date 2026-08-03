/**
 * The fallback picker: nothing to pick from.
 *
 * Same arrangement as `chatStore.ts` and `storageAdapter.ts` — Metro resolves `.native` or `.web`
 * per platform, and this is what `tsc` and `node --test` compile against. It returns `unavailable`
 * rather than throwing, because "there is no picker here" is an outcome the composer already knows
 * how to say.
 */

import type { AttachmentPicker } from '@/core/attachments';

export const attachmentPicker: AttachmentPicker = {
  async pickDocument() {
    return { reason: 'unavailable' as const, status: 'failed' as const };
  },
  async pickMedia() {
    return { reason: 'unavailable' as const, status: 'failed' as const };
  },
};

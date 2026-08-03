/**
 * The fallback recorder: no microphone here.
 *
 * Same arrangement as `picker.ts`. `isAvailable()` returning false is what the composer reads to
 * decide whether to offer the control at all, so this is not a dead branch — it is the answer on
 * any platform Metro has not given a real implementation to.
 */

import type { VoiceRecorder } from '@/core/attachments';

export const voiceRecorder: VoiceRecorder = {
  isAvailable() {
    return false;
  },
  async start() {
    return { reason: 'unavailable' as const, status: 'failed' as const };
  },
  async stop() {
    return { reason: 'unavailable' as const, status: 'failed' as const };
  },
};

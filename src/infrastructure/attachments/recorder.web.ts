/**
 * Recording a voice note in a browser, on `MediaRecorder`.
 *
 * Not `expo-audio` here. Its web support is a shim over this same API, and reaching for it would
 * mean carrying a hook — `useAudioRecorder` — into a layer that has no components in it. The device
 * build uses `expo-audio` properly, imperatively, in `recorder.native.ts`.
 *
 * The microphone track is stopped explicitly on every exit path. A `getUserMedia` stream that is
 * never stopped leaves the browser's recording indicator lit after the recording has finished,
 * which reads as an app that is still listening.
 */

import type { PickResult, VoiceRecorder } from '@/core/attachments';

import { toBase64 } from './base64';

let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

function stopTracks(): void {
  recorder?.stream.getTracks().forEach((track) => track.stop());
}

export const voiceRecorder: VoiceRecorder = {
  isAvailable() {
    return (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices !== undefined &&
      typeof MediaRecorder !== 'undefined'
    );
  },

  async start() {
    if (!this.isAvailable()) return { reason: 'unavailable' as const, status: 'failed' as const };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      recorder.start();
      return { status: 'ok' as const };
    } catch {
      // Denied, or no microphone. Both are the same answer to the person: this cannot happen here.
      return { reason: 'denied' as const, status: 'failed' as const };
    }
  },

  async stop(): Promise<PickResult> {
    const active = recorder;
    if (active === null) return { status: 'cancelled' };

    const blob = await new Promise<Blob>((resolve) => {
      active.addEventListener('stop', () =>
        resolve(new Blob(chunks, { type: active.mimeType || 'audio/webm' })),
      );
      active.stop();
    });

    stopTracks();
    recorder = null;
    chunks = [];

    if (blob.size === 0) return { status: 'cancelled' };

    try {
      const buffer = await blob.arrayBuffer();
      return {
        attachment: {
          bytes: toBase64(new Uint8Array(buffer)),
          kind: 'audio',
          mimeType: blob.type,
          name: 'voice note',
          sizeBytes: blob.size,
        },
        status: 'ok',
      };
    } catch {
      return { reason: 'unreadable', status: 'failed' };
    }
  },
};

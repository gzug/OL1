/**
 * Recording a voice note on a device, on `expo-audio`.
 *
 * Built imperatively from `AudioModule.AudioRecorder` rather than through `useAudioRecorder`.
 * The hook is the documented path and it is the wrong one here: a hook can only be called from a
 * component, and a component is exactly what this layer must not contain — screens reach as far as
 * `src/application/` and no further, which `scripts/check-boundaries.mjs` enforces.
 *
 * `setAudioModeAsync({ allowsRecording: true })` is required on iOS before a recording will produce
 * anything. Without it the file is created and is silent, which is the worst possible failure: it
 * looks like it worked.
 */

import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
} from 'expo-audio';
import { File } from 'expo-file-system';

import { MAX_INLINE_BYTES, type PickResult, type VoiceRecorder } from '@/core/attachments';

import { toBase64 } from './base64';

let recorder: AudioRecorder | null = null;

export const voiceRecorder: VoiceRecorder = {
  isAvailable() {
    return true;
  },

  async start() {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return { reason: 'denied' as const, status: 'failed' as const };

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      /*
       * `AudioModule` is expo-audio's native module INSTANCE, re-exported by value from
       * `ExpoAudio`. eslint-plugin-import resolves the name back to the `./AudioModule` module and
       * checks members against that module's exports, where `AudioRecorder` is a property of the
       * default export rather than an export itself. `tsc` types it correctly and passes: this is
       * the rule being wrong about one re-export, not a missing member.
       *
       * The directive has to be the LAST comment line before the code — `disable-next-line` means
       * the next line, and an explanation written underneath it lands on a comment instead.
       */
      // eslint-disable-next-line import/namespace
      const next = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await next.prepareToRecordAsync();
      next.record();
      recorder = next;
      return { status: 'ok' as const };
    } catch {
      return { reason: 'unavailable' as const, status: 'failed' as const };
    }
  },

  async stop(): Promise<PickResult> {
    const active = recorder;
    recorder = null;
    if (active === null) return { status: 'cancelled' };

    try {
      await active.stop();
      const uri = active.uri;
      if (uri === null) return { status: 'cancelled' };

      const file = new File(uri);
      const sizeBytes = file.size ?? 0;
      if (sizeBytes === 0) return { status: 'cancelled' };
      if (sizeBytes > MAX_INLINE_BYTES) return { reason: 'too-large', status: 'failed' };

      const buffer = await file.arrayBuffer();
      return {
        attachment: {
          bytes: toBase64(new Uint8Array(buffer)),
          kind: 'audio',
          // HIGH_QUALITY records AAC in an MPEG-4 container on both platforms.
          mimeType: 'audio/mp4',
          name: 'voice note',
          sizeBytes,
        },
        status: 'ok',
      };
    } catch {
      return { reason: 'unreadable', status: 'failed' };
    } finally {
      // Leaving the session in recording mode routes later playback to the earpiece on iOS, which
      // sounds like the volume broke.
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  },
};

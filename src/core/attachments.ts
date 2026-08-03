/**
 * What can be attached to a message, as types and ports. No imports, same law as `chat.ts`.
 *
 * One concept, four kinds — a photo, a video, a file and a voice note are the same thing with a
 * different mime type, and modelling them as four features would mean four pickers, four chips and
 * four ways to be wrong about size.
 */

export type AttachmentKind = 'audio' | 'document' | 'image' | 'video';

/**
 * What is kept about an attachment once the message is sent.
 *
 * **Deliberately not the bytes.** A photo of a meal is health data; putting it in a browser's
 * `localStorage` or a phone's chat table means it outlives the question it answered, in a place
 * nobody chose. The bytes exist for the length of one request and then do not.
 */
export type AttachmentRef = {
  readonly kind: AttachmentKind;
  readonly name: string;
  readonly sizeBytes: number;
};

/** An attachment that still has its content, on its way to the model. */
export type Attachment = AttachmentRef & {
  /** Base64, no data-URI prefix. */
  readonly bytes: string;
  readonly mimeType: string;
};

/**
 * The most that goes into one request.
 *
 * Gemini's `generateContent` accepts about 20MB inline including the prompt. Fifteen leaves room for
 * the conversation and keeps the failure on this side of the network, where it can be a sentence
 * rather than a rejected request. A longer video needs the Files API, which is not built yet — so
 * this limit is currently a real ceiling and the UI says so rather than failing at send.
 */
export const MAX_INLINE_BYTES = 15 * 1024 * 1024;

export type PickResult =
  | { readonly attachment: Attachment; readonly status: 'ok' }
  | { readonly status: 'cancelled' }
  | {
      readonly reason: 'denied' | 'too-large' | 'unavailable' | 'unreadable';
      readonly status: 'failed';
    };

/**
 * Choosing something to attach. Like `ChatModel`, these never reject: a cancelled picker and a
 * denied permission are ordinary outcomes, and an exception is a failure mode the caller has to
 * remember to catch.
 */
export interface AttachmentPicker {
  /** Any file the platform will hand over. */
  pickDocument(): Promise<PickResult>;
  /** Photos and videos, from the library. */
  pickMedia(): Promise<PickResult>;
}

export type RecordingState = 'idle' | 'recording' | 'unavailable';

/** Recording a voice note. `stop` returns what was recorded, or a failure. */
export interface VoiceRecorder {
  isAvailable(): boolean;
  start(): Promise<{ reason: 'denied' | 'unavailable'; status: 'failed' } | { status: 'ok' }>;
  stop(): Promise<PickResult>;
}

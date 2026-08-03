/**
 * Bytes to base64.
 *
 * Written out rather than reaching for `btoa` or a package. `btoa` is not in Hermes, and the two
 * lines that would paper over it — a polyfill dependency, or `Buffer` — are a dependency and a
 * Node global respectively. This is the whole of what is needed and it has a test.
 *
 * Chunked because `String.fromCharCode(...bytes)` on a 15MB file spreads fifteen million arguments
 * onto the stack and throws. The chunk size is arbitrary and small enough to be safe everywhere.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CHUNK = 0x8000;

export function toBase64(bytes: Uint8Array): string {
  let out = '';

  for (let start = 0; start < bytes.length; start += CHUNK * 3) {
    out += encodeChunk(bytes.subarray(start, start + CHUNK * 3), start + CHUNK * 3 >= bytes.length);
  }

  return out;
}

/** Only the final chunk pads, which is why chunks are cut on a multiple of three bytes. */
function encodeChunk(bytes: Uint8Array, isLast: boolean): string {
  let out = '';
  let index = 0;

  for (; index + 2 < bytes.length; index += 3) {
    const triple = (bytes[index] << 16) | (bytes[index + 1] << 8) | bytes[index + 2];
    out +=
      ALPHABET[(triple >> 18) & 63] +
      ALPHABET[(triple >> 12) & 63] +
      ALPHABET[(triple >> 6) & 63] +
      ALPHABET[triple & 63];
  }

  if (!isLast) return out;

  const left = bytes.length - index;
  if (left === 1) {
    const value = bytes[index] << 16;
    out += `${ALPHABET[(value >> 18) & 63]}${ALPHABET[(value >> 12) & 63]}==`;
  } else if (left === 2) {
    const value = (bytes[index] << 16) | (bytes[index + 1] << 8);
    out += `${ALPHABET[(value >> 18) & 63]}${ALPHABET[(value >> 12) & 63]}${ALPHABET[(value >> 6) & 63]}=`;
  }

  return out;
}

/** Which of the four kinds a mime type is. Unknown types are documents, which is the safe default. */
export function kindOf(mimeType: string): 'audio' | 'document' | 'image' | 'video' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

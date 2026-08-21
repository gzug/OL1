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

/**
 * Base64 back to text.
 *
 * Written out for the same reasons the encoder above is: `atob` is not in Hermes, and `Buffer` is a
 * Node global. This is the whole of what is needed and it has a test.
 *
 * **UTF-8 is decoded properly rather than byte-by-byte**, and that is not fussiness. The first thing
 * this reads is a Strava export whose headers are `Aktivitätsdatum` and `Aktivitätsart`, and whose
 * activity names carry emoji. Treating those bytes as Latin-1 corrupts the header, the column
 * lookup then finds nothing, and the file is rejected as "not a Strava export" — a failure that
 * looks like a bad file rather than a bad decoder.
 */
export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));

  let out = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const chunk = [0, 1, 2, 3].map((offset) => ALPHABET.indexOf(clean[index + offset] ?? 'A'));
    const value =
      ((chunk[0] as number) << 18) |
      ((chunk[1] as number) << 12) |
      ((chunk[2] as number) << 6) |
      (chunk[3] as number);

    bytes[out] = (value >> 16) & 0xff;
    if (index + 2 < clean.length) bytes[out + 1] = (value >> 8) & 0xff;
    if (index + 3 < clean.length) bytes[out + 2] = value & 0xff;
    out += 3;
  }

  return bytes.subarray(0, out - (clean.length % 4 === 0 ? 0 : 4 - (clean.length % 4)));
}

/** UTF-8 bytes to a string. Malformed sequences become U+FFFD rather than throwing on a real file. */
export function utf8(bytes: Uint8Array): string {
  let out = '';

  for (let index = 0; index < bytes.length; ) {
    const first = bytes[index] as number;
    let code: number;
    let width: number;

    if (first < 0x80) {
      code = first;
      width = 1;
    } else if ((first & 0xe0) === 0xc0) {
      code = first & 0x1f;
      width = 2;
    } else if ((first & 0xf0) === 0xe0) {
      code = first & 0x0f;
      width = 3;
    } else if ((first & 0xf8) === 0xf0) {
      code = first & 0x07;
      width = 4;
    } else {
      out += '�';
      index += 1;
      continue;
    }

    if (index + width > bytes.length) {
      out += '�';
      break;
    }

    for (let offset = 1; offset < width; offset += 1) {
      const next = bytes[index + offset] as number;
      if ((next & 0xc0) !== 0x80) {
        code = 0xfffd;
        break;
      }
      code = (code << 6) | (next & 0x3f);
    }

    // Above the basic plane, a code point is two UTF-16 units. Emoji in activity names land here.
    if (code > 0xffff) {
      const above = code - 0x10000;
      out += String.fromCharCode(0xd800 + (above >> 10), 0xdc00 + (above & 0x3ff));
    } else out += String.fromCharCode(code);

    index += width;
  }

  return out;
}

/** What a picked file's bytes actually say. The one call a screen needs. */
export function textOf(base64: string): string {
  return utf8(fromBase64(base64));
}

/**
 * Picking something to attach, on a device.
 *
 * `expo-image-picker` for photos and video, `expo-document-picker` for everything else. Two modules
 * rather than one because they ask for different permissions: the media library is a permission the
 * user grants, and the document picker is a system sheet that needs none.
 *
 * The file is read through `expo-file-system`'s `File`, which implements `Blob` — so `arrayBuffer()`
 * is the read, and `base64.ts` does the encoding. Nothing here decodes or inspects the content.
 */

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import {
  MAX_INLINE_BYTES,
  type AttachmentPicker,
  type PickResult,
} from '@/core/attachments';

import { kindOf, toBase64 } from './base64';

async function read(
  uri: string,
  name: string,
  mimeType: string,
  knownSize?: number,
): Promise<PickResult> {
  try {
    const file = new File(uri);
    const sizeBytes = knownSize ?? file.size ?? 0;

    // Checked before the read, not after: loading a 200MB video into memory to find out it is too
    // big is the failure mode the limit exists to prevent.
    if (sizeBytes > MAX_INLINE_BYTES) {
      return { reason: 'too-large', status: 'failed' };
    }

    const buffer = await file.arrayBuffer();
    return {
      attachment: {
        bytes: toBase64(new Uint8Array(buffer)),
        kind: kindOf(mimeType),
        mimeType,
        name,
        sizeBytes,
      },
      status: 'ok',
    };
  } catch {
    return { reason: 'unreadable', status: 'failed' };
  }
}

export const attachmentPicker: AttachmentPicker = {
  async pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return { status: 'cancelled' };

    const asset = result.assets[0];
    if (asset === undefined) return { status: 'cancelled' };

    return read(
      asset.uri,
      asset.name,
      asset.mimeType ?? 'application/octet-stream',
      asset.size ?? undefined,
    );
  },

  async pickMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { reason: 'denied', status: 'failed' };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (result.canceled) return { status: 'cancelled' };

    const asset = result.assets[0];
    if (asset === undefined) return { status: 'cancelled' };

    const mimeType = asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
    return read(
      asset.uri,
      asset.fileName ?? `attachment.${mimeType.split('/')[1] ?? 'bin'}`,
      mimeType,
      asset.fileSize ?? undefined,
    );
  },
};
